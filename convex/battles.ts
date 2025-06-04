import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

const typeChart: Record<string, { strong: string[], weak: string[], immune: string[] }> = {
  Fire: { strong: ["Grass", "Ice", "Bug", "Steel"], weak: ["Water", "Ground", "Rock"], immune: [] },
  Water: { strong: ["Fire", "Ground", "Rock"], weak: ["Grass", "Electric"], immune: [] },
  Grass: { strong: ["Water", "Ground", "Rock"], weak: ["Fire", "Ice", "Poison", "Flying", "Bug"], immune: [] },
  Electric: { strong: ["Water", "Flying"], weak: ["Ground"], immune: ["Ground"] },
  Psychic: { strong: ["Fighting", "Poison"], weak: ["Bug", "Ghost", "Dark"], immune: ["Dark"] },
  Ice: { strong: ["Grass", "Ground", "Flying", "Dragon"], weak: ["Fire", "Fighting", "Rock", "Steel"], immune: [] },
  Dragon: { strong: ["Dragon"], weak: ["Ice", "Dragon", "Fairy"], immune: ["Fairy"] },
  Fighting: { strong: ["Normal", "Ice", "Rock", "Dark", "Steel"], weak: ["Flying", "Psychic", "Fairy"], immune: ["Ghost"] },
  Flying: { strong: ["Grass", "Fighting", "Bug"], weak: ["Electric", "Ice", "Rock"], immune: ["Ground"] },
  Poison: { strong: ["Grass", "Fairy"], weak: ["Ground", "Psychic"], immune: [] },
  Ground: { strong: ["Fire", "Electric", "Poison", "Rock", "Steel"], weak: ["Water", "Grass", "Ice"], immune: ["Flying"] },
  Rock: { strong: ["Fire", "Ice", "Flying", "Bug"], weak: ["Water", "Grass", "Fighting", "Ground", "Steel"], immune: [] },
  Bug: { strong: ["Grass", "Psychic", "Dark"], weak: ["Fire", "Flying", "Rock"], immune: [] },
  Ghost: { strong: ["Psychic", "Ghost"], weak: ["Ghost", "Dark"], immune: ["Normal", "Fighting"] },
  Steel: { strong: ["Ice", "Rock", "Fairy"], weak: ["Fire", "Fighting", "Ground"], immune: ["Poison"] },
  Dark: { strong: ["Psychic", "Ghost"], weak: ["Fighting", "Bug", "Fairy"], immune: ["Psychic"] },
  Fairy: { strong: ["Fighting", "Dragon", "Dark"], weak: ["Poison", "Steel"], immune: [] },
  Normal: { strong: [], weak: ["Fighting"], immune: ["Ghost"] },
};

function getStatMultiplier(stages: number): number {
  // Pokemon stat stage multipliers: -6 to +6 stages
  const multipliers = [0.25, 0.28, 0.33, 0.4, 0.5, 0.66, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
  const index = Math.max(0, Math.min(12, stages + 6));
  return multipliers[index];
}

function calculateDamage(
  attackerMove: { power: number; type: string }, 
  attackerAttack: number,
  defenderDefense: number,
  defenderTypes: string[],
  attackerStatMods?: { attack: number; defense: number; speed: number },
  defenderStatMods?: { attack: number; defense: number; speed: number }
): number {
  let effectiveness = 1;
  
  for (const defenderType of defenderTypes) {
    const attackerTypeChart = typeChart[attackerMove.type];
    if (attackerTypeChart.strong.includes(defenderType)) {
      effectiveness *= 2;
    } else if (attackerTypeChart.weak.includes(defenderType)) {
      effectiveness *= 0.5;
    } else if (attackerTypeChart.immune.includes(defenderType)) {
      effectiveness *= 0;
    }
  }

  // Apply stat modifications
  const modifiedAttack = attackerAttack * getStatMultiplier(attackerStatMods?.attack || 0);
  const modifiedDefense = defenderDefense * getStatMultiplier(defenderStatMods?.defense || 0);
  
  // Basic damage formula: ((Attack / Defense) * MovePower * Effectiveness) / 10
  const baseDamage = Math.floor(((modifiedAttack / modifiedDefense) * attackerMove.power * effectiveness) / 10);
  
  // Add some randomness (±20%)
  const variance = Math.random() * 0.4 - 0.2; // -20% to +20%
  return Math.max(1, Math.floor(baseDamage * (1 + variance)));
}

export const createBattle = mutation({
  args: {
    player1Team: v.array(v.id("pokemon")),
    player2Team: v.array(v.id("pokemon")),
    player1Pokemon: v.id("pokemon"),
    player2Pokemon: v.id("pokemon"),
  },
  handler: async (ctx, args) => {
    const pokemon1 = await ctx.db.get(args.player1Pokemon);
    const pokemon2 = await ctx.db.get(args.player2Pokemon);
    
    if (!pokemon1 || !pokemon2) {
      throw new Error("Pokemon not found");
    }

    // Determine turn order by speed
    const firstTurn = pokemon1.speed >= pokemon2.speed ? "player1" : "player2";

    return await ctx.db.insert("battles", {
      player1Team: args.player1Team,
      player2Team: args.player2Team,
      player1ActivePokemon: args.player1Pokemon,
      player2ActivePokemon: args.player2Pokemon,
      currentTurn: firstTurn,
      player1ActiveHp: pokemon1.hp,
      player2ActiveHp: pokemon2.hp,
      player1FaintedPokemon: [],
      player2FaintedPokemon: [],
      player1StatMods: { attack: 0, defense: 0, speed: 0 },
      player2StatMods: { attack: 0, defense: 0, speed: 0 },
      status: "active",
      battleLog: [`Battle begins! ${pokemon1.name} vs ${pokemon2.name}`],
    });
  },
});

export const performMove = mutation({
  args: {
    battleId: v.id("battles"),
    moveIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || battle.status !== "active") {
      throw new Error("Battle not found or not active");
    }

    const [pokemon1, pokemon2] = await Promise.all([
      ctx.db.get(battle.player1ActivePokemon),
      ctx.db.get(battle.player2ActivePokemon),
    ]);

    if (!pokemon1 || !pokemon2) {
      throw new Error("Pokemon not found");
    }

    const isPlayer1Turn = battle.currentTurn === "player1";
    const attacker = isPlayer1Turn ? pokemon1 : pokemon2;
    const defender = isPlayer1Turn ? pokemon2 : pokemon1;
    const attackerHp = isPlayer1Turn ? battle.player1ActiveHp : battle.player2ActiveHp;
    const defenderHp = isPlayer1Turn ? battle.player2ActiveHp : battle.player1ActiveHp;

    if (args.moveIndex >= attacker.moves.length) {
      throw new Error("Invalid move index");
    }

    const move = attacker.moves[args.moveIndex];
    
    // Check accuracy
    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      const newLog = [...battle.battleLog, `${attacker.name} used ${move.name}, but it missed!`];
      await ctx.db.patch(args.battleId, {
        currentTurn: isPlayer1Turn ? "player2" : "player1",
        battleLog: newLog,
      });
      return;
    }

    const attackerStatMods = isPlayer1Turn ? battle.player1StatMods : battle.player2StatMods;
    const defenderStatMods = isPlayer1Turn ? battle.player2StatMods : battle.player1StatMods;
    
    const damage = move.power === 0 ? 0 : calculateDamage(move, attacker.attack, defender.defense, defender.types, attackerStatMods, defenderStatMods);
    const newDefenderHp = Math.max(0, defenderHp - damage);

    let effectiveness = "";
    let multiplier = 1;
    for (const defenderType of defender.types) {
      const attackerTypeChart = typeChart[move.type];
      if (attackerTypeChart.strong.includes(defenderType)) {
        multiplier *= 2;
      } else if (attackerTypeChart.weak.includes(defenderType)) {
        multiplier *= 0.5;
      } else if (attackerTypeChart.immune.includes(defenderType)) {
        multiplier *= 0;
      }
    }
    
    if (multiplier > 1) effectiveness = " It's super effective!";
    else if (multiplier < 1 && multiplier > 0) effectiveness = " It's not very effective...";
    else if (multiplier === 0) effectiveness = " It has no effect!";

    let newLog = move.power === 0 
      ? [...battle.battleLog, `${attacker.name} used ${move.name}!`]
      : [...battle.battleLog, `${attacker.name} used ${move.name}! It dealt ${damage} damage.${effectiveness}`];
    
    // Handle stat modification effects
    let updatedPlayer1StatMods = battle.player1StatMods || { attack: 0, defense: 0, speed: 0 };
    let updatedPlayer2StatMods = battle.player2StatMods || { attack: 0, defense: 0, speed: 0 };
    
    if (move.effect && (move.effect.type === "stat_boost" || move.effect.type === "stat_reduction")) {
      const targetIsPlayer1 = (move.effect.target === "self" && isPlayer1Turn) || (move.effect.target === "opponent" && !isPlayer1Turn);
      const currentStatMods = targetIsPlayer1 ? updatedPlayer1StatMods : updatedPlayer2StatMods;
      const targetPokemon = targetIsPlayer1 ? attacker : defender;
      
      const oldValue = currentStatMods[move.effect.stat];
      const newValue = Math.max(-6, Math.min(6, oldValue + move.effect.stages));
      
      if (newValue !== oldValue) {
        currentStatMods[move.effect.stat] = newValue;
        
        const statName = move.effect.stat.charAt(0).toUpperCase() + move.effect.stat.slice(1);
        const changeDescription = move.effect.stages > 0 ? 
          (move.effect.stages === 1 ? "rose" : move.effect.stages === 2 ? "rose sharply" : "rose drastically") :
          (move.effect.stages === -1 ? "fell" : move.effect.stages === -2 ? "fell sharply" : "fell drastically");
        
        newLog.push(`${targetPokemon.name}'s ${statName} ${changeDescription}!`);
      } else {
        const statName = move.effect.stat.charAt(0).toUpperCase() + move.effect.stat.slice(1);
        const limitDescription = move.effect.stages > 0 ? "can't go any higher" : "can't go any lower";
        newLog.push(`${targetPokemon.name}'s ${statName} ${limitDescription}!`);
      }
      
      if (targetIsPlayer1) {
        updatedPlayer1StatMods = currentStatMods;
      } else {
        updatedPlayer2StatMods = currentStatMods;
      }
    }

    // Handle Pokemon fainting
    if (newDefenderHp === 0) {
      newLog.push(`${defender.name} fainted!`);
      
      const defendingPlayer = isPlayer1Turn ? "player2" : "player1";
      const newFaintedList = isPlayer1Turn 
        ? [...battle.player2FaintedPokemon, battle.player2ActivePokemon]
        : [...battle.player1FaintedPokemon, battle.player1ActivePokemon];
      
      const availableTeam = isPlayer1Turn ? battle.player2Team : battle.player1Team;
      const faintedPokemon = isPlayer1Turn ? battle.player2FaintedPokemon : battle.player1FaintedPokemon;
      const remainingPokemon = availableTeam.filter(id => !faintedPokemon.includes(id) && id !== (isPlayer1Turn ? battle.player2ActivePokemon : battle.player1ActivePokemon));
      
      if (remainingPokemon.length === 0) {
        // All Pokemon fainted - battle ends
        const newStatus = isPlayer1Turn ? "player1_wins" : "player2_wins";
        const winner = isPlayer1Turn ? pokemon1.name : pokemon2.name;
        newLog.push(`All ${defendingPlayer === "player1" ? "Player 1's" : "Player 2's"} Pokemon have fainted! ${winner} wins the battle!`);
        
        await ctx.db.patch(args.battleId, {
          ...(isPlayer1Turn 
            ? { player2ActiveHp: newDefenderHp, player2FaintedPokemon: newFaintedList } 
            : { player1ActiveHp: newDefenderHp, player1FaintedPokemon: newFaintedList }
          ),
          player1StatMods: updatedPlayer1StatMods,
          player2StatMods: updatedPlayer2StatMods,
          status: newStatus,
          battleLog: newLog,
        });
      } else {
        // Pokemon available - need to select new one
        const newStatus = isPlayer1Turn ? "player2_selecting" : "player1_selecting";
        
        await ctx.db.patch(args.battleId, {
          ...(isPlayer1Turn 
            ? { player2ActiveHp: newDefenderHp, player2FaintedPokemon: newFaintedList } 
            : { player1ActiveHp: newDefenderHp, player1FaintedPokemon: newFaintedList }
          ),
          player1StatMods: updatedPlayer1StatMods,
          player2StatMods: updatedPlayer2StatMods,
          status: newStatus,
          battleLog: newLog,
        });
      }
    } else {
      // Pokemon survives - continue battle
      await ctx.db.patch(args.battleId, {
        ...(isPlayer1Turn 
          ? { player2ActiveHp: newDefenderHp } 
          : { player1ActiveHp: newDefenderHp }
        ),
        player1StatMods: updatedPlayer1StatMods,
        player2StatMods: updatedPlayer2StatMods,
        currentTurn: isPlayer1Turn ? "player2" : "player1",
        battleLog: newLog,
      });
    }
  },
});

export const switchPokemon = mutation({
  args: {
    battleId: v.id("battles"),
    pokemonId: v.id("pokemon"),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      throw new Error("Battle not found");
    }

    const pokemon = await ctx.db.get(args.pokemonId);
    if (!pokemon) {
      throw new Error("Pokemon not found");
    }

    const isPlayer1Selecting = battle.status === "player1_selecting";
    const isPlayer2Selecting = battle.status === "player2_selecting";
    const isActiveVoluntarySwitch = battle.status === "active" && battle.currentTurn === "player1";
    
    if (!isPlayer1Selecting && !isPlayer2Selecting && !isActiveVoluntarySwitch) {
      throw new Error("Not allowed to switch Pokemon at this time");
    }

    const newLog = [...battle.battleLog, `${isPlayer1Selecting || isActiveVoluntarySwitch ? "Player 1" : "Player 2"} sent out ${pokemon.name}!`];

    if (isPlayer1Selecting) {
      await ctx.db.patch(args.battleId, {
        player1ActivePokemon: args.pokemonId,
        player1ActiveHp: pokemon.hp,
        player1StatMods: { attack: 0, defense: 0, speed: 0 }, // Reset stat mods
        status: "active",
        currentTurn: "player1", // Player who just switched gets first turn
        battleLog: newLog,
      });
    } else if (isPlayer2Selecting) {
      await ctx.db.patch(args.battleId, {
        player2ActivePokemon: args.pokemonId,
        player2ActiveHp: pokemon.hp,
        player2StatMods: { attack: 0, defense: 0, speed: 0 }, // Reset stat mods
        status: "active", 
        currentTurn: "player2", // Player who just switched gets first turn
        battleLog: newLog,
      });
    } else if (isActiveVoluntarySwitch) {
      // Voluntary switch during active battle - player loses their turn
      await ctx.db.patch(args.battleId, {
        player1ActivePokemon: args.pokemonId,
        player1ActiveHp: pokemon.hp,
        player1StatMods: { attack: 0, defense: 0, speed: 0 }, // Reset stat mods
        currentTurn: "player2", // Switch ends player's turn
        battleLog: newLog,
      });
    }
  },
});

export const performAIMove = mutation({
  args: {
    battleId: v.id("battles"),
  },
  handler: async (ctx, args): Promise<void> => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || battle.status !== "active" || battle.currentTurn !== "player2") {
      return; // Only AI moves when it's player2's turn
    }

    // Just call performMove with a random move index
    const pokemon2 = await ctx.db.get(battle.player2ActivePokemon);
    if (!pokemon2) return;

    const moveIndex = Math.floor(Math.random() * pokemon2.moves.length);
    
    // Use the existing performMove logic by calling it
    await ctx.runMutation(api.battles.performMove, {
      battleId: args.battleId,
      moveIndex,
    });
  },
});

export const getBattle = query({
  args: { id: v.id("battles") },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.id);
    if (!battle) return null;

    const [pokemon1, pokemon2, player1Team, player2Team] = await Promise.all([
      ctx.db.get(battle.player1ActivePokemon),
      ctx.db.get(battle.player2ActivePokemon),
      Promise.all(battle.player1Team.map(id => ctx.db.get(id))),
      Promise.all(battle.player2Team.map(id => ctx.db.get(id))),
    ]);

    return {
      ...battle,
      pokemon1,
      pokemon2,
      player1Team: player1Team.filter(Boolean),
      player2Team: player2Team.filter(Boolean),
    };
  },
});