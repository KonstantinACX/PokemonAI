import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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
  defenderStatMods?: { attack: number; defense: number; speed: number },
  attackerStatusEffect?: string
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
  let modifiedAttack = attackerAttack * getStatMultiplier(attackerStatMods?.attack || 0);
  const modifiedDefense = defenderDefense * getStatMultiplier(defenderStatMods?.defense || 0);
  
  // Apply status effect penalties
  if (attackerStatusEffect === "burn") {
    modifiedAttack *= 0.5; // Burn halves attack
  }
  
  // Basic damage formula: ((Attack / Defense) * MovePower * Effectiveness) / 5 (doubled from /10)
  // Increased by 1.5x to speed up battles
  const baseDamage = Math.floor(((modifiedAttack / modifiedDefense) * attackerMove.power * effectiveness * 1.5) / 5);
  
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
      battleType: "ai", // Mark as AI battle
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
      lastActivity: Date.now(),
    });
  },
});

export const createMultiplayerBattle = mutation({
  args: {
    player1Id: v.id("users"),
    player2Id: v.id("users"),
    player1Team: v.array(v.id("pokemon")),
    player2Team: v.array(v.id("pokemon")),
    player1ActivePokemon: v.id("pokemon"),
    player2ActivePokemon: v.id("pokemon"),
  },
  handler: async (ctx, args) => {
    const pokemon1 = await ctx.db.get(args.player1ActivePokemon);
    const pokemon2 = await ctx.db.get(args.player2ActivePokemon);
    
    if (!pokemon1 || !pokemon2) {
      throw new Error("Pokemon not found");
    }

    // Determine turn order by speed
    const firstTurn = pokemon1.speed >= pokemon2.speed ? "player1" : "player2";

    return await ctx.db.insert("battles", {
      battleType: "multiplayer", // Mark as multiplayer battle
      player1Id: args.player1Id,
      player2Id: args.player2Id,
      player1Team: args.player1Team,
      player2Team: args.player2Team,
      player1ActivePokemon: args.player1ActivePokemon,
      player2ActivePokemon: args.player2ActivePokemon,
      currentTurn: firstTurn,
      player1ActiveHp: pokemon1.hp,
      player2ActiveHp: pokemon2.hp,
      player1FaintedPokemon: [],
      player2FaintedPokemon: [],
      player1StatMods: { attack: 0, defense: 0, speed: 0 },
      player2StatMods: { attack: 0, defense: 0, speed: 0 },
      status: "active",
      battleLog: [`Multiplayer battle begins! ${pokemon1.name} vs ${pokemon2.name}`],
      lastActivity: Date.now(),
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

    // For multiplayer battles, verify the user can make this move
    if (battle.battleType === "multiplayer") {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Must be authenticated for multiplayer battles");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => 
          q.eq("clerkId", identity.subject)
        )
        .unique();

      if (!user) {
        throw new Error("User not found");
      }

      // Check if it's this user's turn
      const isPlayer1 = battle.player1Id === user._id;
      const isPlayer2 = battle.player2Id === user._id;
      
      if (!isPlayer1 && !isPlayer2) {
        throw new Error("User not part of this battle");
      }

      const isUserTurn = (isPlayer1 && battle.currentTurn === "player1") || 
                        (isPlayer2 && battle.currentTurn === "player2");
      
      if (!isUserTurn) {
        throw new Error("Not your turn");
      }
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
    
    // Check if attacker can move due to status effects
    const attackerStatusEffect = isPlayer1Turn ? battle.player1StatusEffect : battle.player2StatusEffect;
    let statusPreventedMove = false;
    const statusLog: string[] = [];
    
    if (attackerStatusEffect) {
      switch (attackerStatusEffect) {
        case "freeze":
          // 20% chance to thaw out each turn
          if (Math.random() < 0.2) {
            statusLog.push(`${attacker.name} thawed out!`);
            // Will clear status effect at end of function
          } else {
            statusPreventedMove = true;
            statusLog.push(`${attacker.name} is frozen solid and can't move!`);
          }
          break;
        case "sleep": {
          const currentStatusTurns = isPlayer1Turn ? battle.player1StatusTurns : battle.player2StatusTurns;
          if (currentStatusTurns && currentStatusTurns <= 1) {
            statusLog.push(`${attacker.name} woke up!`);
            // Will clear status effect at end of function
          } else {
            statusPreventedMove = true;
            statusLog.push(`${attacker.name} is fast asleep and can't move!`);
          }
          break;
        }
        case "paralyze":
          // 25% chance to be fully paralyzed
          if (Math.random() < 0.25) {
            statusPreventedMove = true;
            statusLog.push(`${attacker.name} is paralyzed and can't move!`);
          }
          break;
      }
    }
    
    if (statusPreventedMove) {
      const newLog = [...battle.battleLog, ...statusLog];
      await ctx.db.patch(args.battleId, {
        currentTurn: isPlayer1Turn ? "player2" : "player1",
        battleLog: newLog,
      });
      return;
    }
    
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
    
    const damage = move.power === 0 ? 0 : calculateDamage(move, attacker.attack, defender.defense, defender.types, attackerStatMods, defenderStatMods, attackerStatusEffect);
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

    const newLog = move.power === 0 
      ? [...battle.battleLog, `${attacker.name} used ${move.name}!`]
      : [...battle.battleLog, `${attacker.name} used ${move.name}! It dealt ${damage} damage.${effectiveness}`];
    
    // Handle stat modification effects
    let updatedPlayer1StatMods = battle.player1StatMods || { attack: 0, defense: 0, speed: 0 };
    let updatedPlayer2StatMods = battle.player2StatMods || { attack: 0, defense: 0, speed: 0 };
    
    if (move.effect && (move.effect.type === "stat_boost" || move.effect.type === "stat_reduction") && move.effect.stat && move.effect.stages !== undefined) {
      const targetIsPlayer1 = (move.effect.target === "self" && isPlayer1Turn) || (move.effect.target === "opponent" && !isPlayer1Turn);
      const currentStatMods = targetIsPlayer1 ? updatedPlayer1StatMods : updatedPlayer2StatMods;
      const targetPokemon = targetIsPlayer1 ? attacker : defender;
      
      const statName = move.effect.stat;
      const stageChange = move.effect.stages;
      
      const oldValue = currentStatMods[statName];
      const newValue = Math.max(-6, Math.min(6, oldValue + stageChange));
      
      if (newValue !== oldValue) {
        currentStatMods[statName] = newValue;
        
        const displayStatName = statName.charAt(0).toUpperCase() + statName.slice(1);
        const changeDescription = stageChange > 0 ? 
          (stageChange === 1 ? "rose" : stageChange === 2 ? "rose sharply" : "rose drastically") :
          (stageChange === -1 ? "fell" : stageChange === -2 ? "fell sharply" : "fell drastically");
        
        newLog.push(`${targetPokemon.name}'s ${displayStatName} ${changeDescription}!`);
      } else {
        const displayStatName = statName.charAt(0).toUpperCase() + statName.slice(1);
        const limitDescription = stageChange > 0 ? "can't go any higher" : "can't go any lower";
        newLog.push(`${targetPokemon.name}'s ${displayStatName} ${limitDescription}!`);
      }
      
      if (targetIsPlayer1) {
        updatedPlayer1StatMods = currentStatMods;
      } else {
        updatedPlayer2StatMods = currentStatMods;
      }
    }

    // Handle status effect infliction
    let updatedPlayer1StatusEffect = battle.player1StatusEffect;
    let updatedPlayer2StatusEffect = battle.player2StatusEffect;
    let updatedPlayer1StatusTurns = battle.player1StatusTurns;
    let updatedPlayer2StatusTurns = battle.player2StatusTurns;
    
    if (move.effect && move.effect.type === "status_effect" && move.effect.statusEffect && move.effect.chance) {
      const targetIsPlayer1 = (move.effect.target === "self" && isPlayer1Turn) || (move.effect.target === "opponent" && !isPlayer1Turn);
      const targetPokemon = targetIsPlayer1 ? attacker : defender;
      const currentStatusEffect = targetIsPlayer1 ? battle.player1StatusEffect : battle.player2StatusEffect;
      
      // Only inflict status if target doesn't already have one (no status stacking)
      if (!currentStatusEffect) {
        const statusChance = Math.random() * 100;
        if (statusChance <= move.effect.chance) {
          const statusName = move.effect.statusEffect;
          
          // Set status duration based on type
          let statusTurns = 0;
          switch (statusName) {
            case "poison":
            case "burn":
              statusTurns = -1; // Lasts until switched/cured
              break;
            case "paralyze":
              statusTurns = -1; // Permanent until cured
              break;
            case "freeze":
              statusTurns = Math.floor(Math.random() * 3) + 2; // 2-4 turns
              break;
            case "sleep":
              statusTurns = Math.floor(Math.random() * 3) + 1; // 1-3 turns
              break;
          }
          
          if (targetIsPlayer1) {
            updatedPlayer1StatusEffect = statusName;
            updatedPlayer1StatusTurns = statusTurns;
          } else {
            updatedPlayer2StatusEffect = statusName;
            updatedPlayer2StatusTurns = statusTurns;
          }
          
          const statusMessages: Record<string, string> = {
            poison: "was poisoned",
            burn: "was burned",
            paralyze: "was paralyzed",
            freeze: "was frozen solid",
            sleep: "fell asleep"
          };
          
          newLog.push(`${targetPokemon.name} ${statusMessages[statusName]}!`);
        }
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
        
        // For multiplayer battles, get actual player names
        if (battle.battleType === "multiplayer") {
          const player1User = await ctx.db.get(battle.player1Id!);
          const player2User = await ctx.db.get(battle.player2Id!);
          const winnerName = isPlayer1Turn 
            ? (player1User?.displayName || player1User?.name || "Player 1")
            : (player2User?.displayName || player2User?.name || "Player 2");
          const loserName = isPlayer1Turn 
            ? (player2User?.displayName || player2User?.name || "Player 2")
            : (player1User?.displayName || player1User?.name || "Player 1");
          
          newLog.push(`All ${loserName}'s Pokemon have fainted! ${winnerName} wins the battle!`);
        } else {
          // AI battle - use original logic
          const winner = isPlayer1Turn ? pokemon1.name : pokemon2.name;
          newLog.push(`All ${defendingPlayer === "player1" ? "Player 1's" : "Player 2's"} Pokemon have fainted! ${winner} wins the battle!`);
        }
        
        await ctx.db.patch(args.battleId, {
          ...(isPlayer1Turn 
            ? { player2ActiveHp: newDefenderHp, player2FaintedPokemon: newFaintedList } 
            : { player1ActiveHp: newDefenderHp, player1FaintedPokemon: newFaintedList }
          ),
          player1StatMods: updatedPlayer1StatMods,
          player2StatMods: updatedPlayer2StatMods,
          player1StatusEffect: updatedPlayer1StatusEffect,
          player2StatusEffect: updatedPlayer2StatusEffect,
          player1StatusTurns: updatedPlayer1StatusTurns,
          player2StatusTurns: updatedPlayer2StatusTurns,
          status: newStatus,
          battleLog: newLog,
        });
        
        // Award XP to all participating Pokemon when battle ends
        await awardBattleXp(ctx, battle, isPlayer1Turn);
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
          player1StatusEffect: updatedPlayer1StatusEffect,
          player2StatusEffect: updatedPlayer2StatusEffect,
          player1StatusTurns: updatedPlayer1StatusTurns,
          player2StatusTurns: updatedPlayer2StatusTurns,
          status: newStatus,
          battleLog: newLog,
        });
      }
    } else {
      // Process end-of-turn status effects (poison, burn, status countdown)
      let finalPlayer1Hp = isPlayer1Turn ? attackerHp : newDefenderHp;
      let finalPlayer2Hp = isPlayer1Turn ? newDefenderHp : attackerHp;
      
      // Handle poison/burn damage
      if (updatedPlayer1StatusEffect === "poison" || updatedPlayer1StatusEffect === "burn") {
        const statusDamage = Math.max(1, Math.floor(pokemon1.hp / 16)); // 1/16 of max HP
        finalPlayer1Hp = Math.max(0, finalPlayer1Hp - statusDamage);
        const statusName = updatedPlayer1StatusEffect === "poison" ? "poison" : "burn";
        newLog.push(`${pokemon1.name} is hurt by its ${statusName}! (${statusDamage} damage)`);
      }
      
      if (updatedPlayer2StatusEffect === "poison" || updatedPlayer2StatusEffect === "burn") {
        const statusDamage = Math.max(1, Math.floor(pokemon2.hp / 16)); // 1/16 of max HP
        finalPlayer2Hp = Math.max(0, finalPlayer2Hp - statusDamage);
        const statusName = updatedPlayer2StatusEffect === "poison" ? "poison" : "burn";
        newLog.push(`${pokemon2.name} is hurt by its ${statusName}! (${statusDamage} damage)`);
      }
      
      // Update status turn counters and clear expired statuses
      if (updatedPlayer1StatusTurns && updatedPlayer1StatusTurns > 0) {
        updatedPlayer1StatusTurns -= 1;
        if (updatedPlayer1StatusTurns <= 0) {
          if (updatedPlayer1StatusEffect === "sleep") {
            newLog.push(`${pokemon1.name} woke up!`);
          } else if (updatedPlayer1StatusEffect === "freeze") {
            newLog.push(`${pokemon1.name} thawed out!`);
          }
          updatedPlayer1StatusEffect = undefined;
          updatedPlayer1StatusTurns = undefined;
        }
      }
      
      if (updatedPlayer2StatusTurns && updatedPlayer2StatusTurns > 0) {
        updatedPlayer2StatusTurns -= 1;
        if (updatedPlayer2StatusTurns <= 0) {
          if (updatedPlayer2StatusEffect === "sleep") {
            newLog.push(`${pokemon2.name} woke up!`);
          } else if (updatedPlayer2StatusEffect === "freeze") {
            newLog.push(`${pokemon2.name} thawed out!`);
          }
          updatedPlayer2StatusEffect = undefined;
          updatedPlayer2StatusTurns = undefined;
        }
      }
      
      // Check if any Pokemon fainted due to status damage
      if (finalPlayer1Hp <= 0) {
        newLog.push(`${pokemon1.name} fainted!`);
        
        // Award XP for knockout to the opposing team and capture level-up results
        let levelUpResult = null;
        if (battle.battleType === "ai") {
          // In AI battle, player gets XP for AI Pokemon fainting
          levelUpResult = await ctx.runMutation(api.pokemon.awardXpAndCheckLevelUp, {
            pokemonId: battle.player1ActivePokemon,
            xpGained: 75, // Knockout XP
          });
        } else if (battle.battleType === "multiplayer") {
          // In multiplayer, award XP to the opposing player's active Pokemon
          levelUpResult = await ctx.runMutation(api.pokemon.awardXpAndCheckLevelUp, {
            pokemonId: battle.player2ActivePokemon,
            xpGained: 75, // Knockout XP
          });
        }
        
        // Add level-up result to battle if Pokemon leveled up
        if (levelUpResult?.leveledUp) {
          const currentLevelUpResults = battle.levelUpResults || [];
          const receivingPokemon = battle.battleType === "ai" ? pokemon1 : pokemon2;
          currentLevelUpResults.push({
            pokemonId: receivingPokemon._id,
            pokemonName: receivingPokemon.name,
            oldLevel: levelUpResult.oldLevel,
            newLevel: levelUpResult.newLevel,
            xpGained: levelUpResult.xpGained,
          });
          
          await ctx.db.patch(args.battleId, {
            levelUpResults: currentLevelUpResults,
          });
        }
        
        // Check if player has any remaining Pokemon
        const remainingPlayer1Pokemon = battle.player1Team.filter(id => id !== battle.player1ActivePokemon);
        if (remainingPlayer1Pokemon.length === 0) {
          // Player1 has no more Pokemon - Player2 wins
          await awardBattleXp(ctx, battle, false);
          await ctx.db.patch(args.battleId, {
            status: "player2_wins",
            battleLog: newLog,
          });
          return;
        } else {
          // Force player1 to switch Pokemon
          await ctx.db.patch(args.battleId, {
            status: "player1_selecting",
            player1ActiveHp: finalPlayer1Hp,
            player2ActiveHp: finalPlayer2Hp,
            battleLog: newLog,
          });
          return;
        }
      }
      
      if (finalPlayer2Hp <= 0) {
        newLog.push(`${pokemon2.name} fainted!`);
        
        // Award XP for knockout to the opposing team and capture level-up results
        let levelUpResult = null;
        if (battle.battleType === "ai") {
          // In AI battle, player gets XP for AI Pokemon fainting
          levelUpResult = await ctx.runMutation(api.pokemon.awardXpAndCheckLevelUp, {
            pokemonId: battle.player1ActivePokemon,
            xpGained: 75, // Knockout XP
          });
        } else if (battle.battleType === "multiplayer") {
          // In multiplayer, award XP to the opposing player's active Pokemon
          levelUpResult = await ctx.runMutation(api.pokemon.awardXpAndCheckLevelUp, {
            pokemonId: battle.player1ActivePokemon,
            xpGained: 75, // Knockout XP
          });
        }
        
        // Add level-up result to battle if Pokemon leveled up
        if (levelUpResult?.leveledUp) {
          const currentLevelUpResults = battle.levelUpResults || [];
          currentLevelUpResults.push({
            pokemonId: pokemon1._id,
            pokemonName: pokemon1.name,
            oldLevel: levelUpResult.oldLevel,
            newLevel: levelUpResult.newLevel,
            xpGained: levelUpResult.xpGained,
          });
          
          await ctx.db.patch(args.battleId, {
            levelUpResults: currentLevelUpResults,
          });
        }
        
        // Check if player has any remaining Pokemon
        const remainingPlayer2Pokemon = battle.player2Team.filter(id => id !== battle.player2ActivePokemon);
        if (remainingPlayer2Pokemon.length === 0) {
          // Player2 has no more Pokemon - Player1 wins
          await awardBattleXp(ctx, battle, true);
          await ctx.db.patch(args.battleId, {
            status: "player1_wins",
            battleLog: newLog,
          });
          return;
        } else {
          // Handle AI or multiplayer switching
          if (battle.battleType === "ai") {
            // AI automatically switches to next Pokemon
            const nextPokemon = remainingPlayer2Pokemon[0];
            const nextPokemonData = await ctx.db.get(nextPokemon);
            if (nextPokemonData) {
              newLog.push(`AI sends out ${nextPokemonData.name}!`);
              await ctx.db.patch(args.battleId, {
                player2ActivePokemon: nextPokemon,
                player2ActiveHp: nextPokemonData.hp,
                player1ActiveHp: finalPlayer1Hp,
                battleLog: newLog,
                currentTurn: "player1",
              });
              return;
            }
          } else {
            // Force player2 to switch Pokemon
            await ctx.db.patch(args.battleId, {
              status: "player2_selecting",
              player1ActiveHp: finalPlayer1Hp,
              player2ActiveHp: finalPlayer2Hp,
              battleLog: newLog,
            });
            return;
          }
        }
      }
      
      // Pokemon survives - continue battle
      await ctx.db.patch(args.battleId, {
        player1ActiveHp: finalPlayer1Hp,
        player2ActiveHp: finalPlayer2Hp,
        player1StatMods: updatedPlayer1StatMods,
        player2StatMods: updatedPlayer2StatMods,
        player1StatusEffect: updatedPlayer1StatusEffect,
        player2StatusEffect: updatedPlayer2StatusEffect,
        player1StatusTurns: updatedPlayer1StatusTurns,
        player2StatusTurns: updatedPlayer2StatusTurns,
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
        player1StatusEffect: undefined, // Clear status effects
        player1StatusTurns: undefined,
        status: "active",
        currentTurn: "player1", // Player who just switched gets first turn
        battleLog: newLog,
      });
    } else if (isPlayer2Selecting) {
      await ctx.db.patch(args.battleId, {
        player2ActivePokemon: args.pokemonId,
        player2ActiveHp: pokemon.hp,
        player2StatMods: { attack: 0, defense: 0, speed: 0 }, // Reset stat mods
        player2StatusEffect: undefined, // Clear status effects
        player2StatusTurns: undefined,
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
        player1StatusEffect: undefined, // Clear status effects
        player1StatusTurns: undefined,
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

// Helper function to award XP to all Pokemon after battle
async function awardBattleXp(ctx: any, battle: any, player1Won: boolean) {
  console.log("Awarding XP for battle end, player1Won:", player1Won);
  const BATTLE_XP = {
    PARTICIPATION: 50,    // XP for participating in battle
    VICTORY: 100,        // Additional XP for winning team
    KNOCKOUT: 75,        // Additional XP for knocking out opponent Pokemon
    SURVIVAL: 25,        // Additional XP for surviving the battle
  };

  const currentLevelUpResults = battle.levelUpResults || [];

  // Award XP to player 1 team
  for (const pokemonId of battle.player1Team) {
    let totalXp = BATTLE_XP.PARTICIPATION;
    
    // Victory bonus
    if (player1Won) {
      totalXp += BATTLE_XP.VICTORY;
    }
    
    // Survival bonus (not fainted)
    if (!battle.player1FaintedPokemon.includes(pokemonId)) {
      totalXp += BATTLE_XP.SURVIVAL;
    }
    
    // Award XP and check for level up
    try {
      console.log(`Awarding ${totalXp} XP to Pokemon ${pokemonId}`);
      const levelUpResult = await ctx.runMutation(api.pokemon.awardXpAndCheckLevelUp, {
        pokemonId,
        xpGained: totalXp,
      });
      
      // Capture level-up result if Pokemon leveled up
      if (levelUpResult?.leveledUp) {
        const pokemon = await ctx.db.get(pokemonId);
        if (pokemon) {
          currentLevelUpResults.push({
            pokemonId: pokemon._id,
            pokemonName: pokemon.name,
            oldLevel: levelUpResult.oldLevel,
            newLevel: levelUpResult.newLevel,
            xpGained: levelUpResult.xpGained,
          });
        }
      }
    } catch (error) {
      console.error("Error awarding XP to Pokemon:", pokemonId, error);
    }
  }
  
  // Award XP to player 2 team  
  for (const pokemonId of battle.player2Team) {
    let totalXp = BATTLE_XP.PARTICIPATION;
    
    // Victory bonus
    if (!player1Won) {
      totalXp += BATTLE_XP.VICTORY;
    }
    
    // Survival bonus (not fainted)
    if (!battle.player2FaintedPokemon.includes(pokemonId)) {
      totalXp += BATTLE_XP.SURVIVAL;
    }
    
    // Award XP and check for level up
    try {
      console.log(`Awarding ${totalXp} XP to Pokemon ${pokemonId}`);
      const levelUpResult = await ctx.runMutation(api.pokemon.awardXpAndCheckLevelUp, {
        pokemonId,
        xpGained: totalXp,
      });
      
      // Capture level-up result if Pokemon leveled up
      if (levelUpResult?.leveledUp) {
        const pokemon = await ctx.db.get(pokemonId);
        if (pokemon) {
          currentLevelUpResults.push({
            pokemonId: pokemon._id,
            pokemonName: pokemon.name,
            oldLevel: levelUpResult.oldLevel,
            newLevel: levelUpResult.newLevel,
            xpGained: levelUpResult.xpGained,
          });
        }
      }
    } catch (error) {
      console.error("Error awarding XP to Pokemon:", pokemonId, error);
    }
  }
  
  // Save all level-up results to the battle
  if (currentLevelUpResults.length > 0) {
    await ctx.db.patch(battle._id, {
      levelUpResults: currentLevelUpResults,
    });
  }
}

export const endMultiplayerBattle = mutation({
  args: {
    battleId: v.id("battles"),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      throw new Error("Battle not found");
    }

    // Verify this is a multiplayer battle
    if (battle.battleType !== "multiplayer") {
      throw new Error("Can only end multiplayer battles");
    }

    // Verify the user is part of this battle
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => 
        q.eq("clerkId", identity.subject)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const isPlayer1 = battle.player1Id === user._id;
    const isPlayer2 = battle.player2Id === user._id;
    
    if (!isPlayer1 && !isPlayer2) {
      throw new Error("User not part of this battle");
    }

    // Only allow ending if battle is active or in selection state
    if (!["active", "player1_selecting", "player2_selecting"].includes(battle.status)) {
      throw new Error("Battle cannot be ended in current state");
    }

    // End the battle - mark as forfeit by the user who requested it
    const newStatus = isPlayer1 ? "player2_wins" : "player1_wins";
    
    // Get the actual player name who forfeited
    const forfeitingPlayer = await ctx.db.get(user._id);
    const playerName = forfeitingPlayer?.displayName || forfeitingPlayer?.name || (isPlayer1 ? "Player 1" : "Player 2");
    const newLog = [...battle.battleLog, `${playerName} forfeited the battle!`];

    await ctx.db.patch(args.battleId, {
      status: newStatus,
      battleLog: newLog,
    });

    return { success: true };
  },
});