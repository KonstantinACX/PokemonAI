import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

function calculateDamage(
  attackerMove: { power: number; type: string }, 
  attackerAttack: number,
  defenderDefense: number,
  defenderTypes: string[]
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

  // Basic damage formula: ((Attack / Defense) * MovePower * Effectiveness) / 10
  const baseDamage = Math.floor(((attackerAttack / defenderDefense) * attackerMove.power * effectiveness) / 10);
  
  // Add some randomness (±20%)
  const variance = Math.random() * 0.4 - 0.2; // -20% to +20%
  return Math.max(1, Math.floor(baseDamage * (1 + variance)));
}

export const createBattle = mutation({
  args: {
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
      player1Pokemon: args.player1Pokemon,
      player2Pokemon: args.player2Pokemon,
      currentTurn: firstTurn,
      player1Hp: pokemon1.hp,
      player2Hp: pokemon2.hp,
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
      ctx.db.get(battle.player1Pokemon),
      ctx.db.get(battle.player2Pokemon),
    ]);

    if (!pokemon1 || !pokemon2) {
      throw new Error("Pokemon not found");
    }

    const isPlayer1Turn = battle.currentTurn === "player1";
    const attacker = isPlayer1Turn ? pokemon1 : pokemon2;
    const defender = isPlayer1Turn ? pokemon2 : pokemon1;
    const attackerHp = isPlayer1Turn ? battle.player1Hp : battle.player2Hp;
    const defenderHp = isPlayer1Turn ? battle.player2Hp : battle.player1Hp;

    if (moveIndex >= attacker.moves.length) {
      throw new Error("Invalid move index");
    }

    const move = attacker.moves[moveIndex];
    
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

    const damage = calculateDamage(move, attacker.attack, defender.defense, defender.types);
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

    let newLog = [...battle.battleLog, `${attacker.name} used ${move.name}! It dealt ${damage} damage.${effectiveness}`];

    let newStatus: "active" | "player1_wins" | "player2_wins" = "active";
    if (newDefenderHp === 0) {
      newStatus = isPlayer1Turn ? "player1_wins" : "player2_wins";
      newLog.push(`${defender.name} fainted! ${attacker.name} wins!`);
    }

    await ctx.db.patch(args.battleId, {
      ...(isPlayer1Turn 
        ? { player2Hp: newDefenderHp } 
        : { player1Hp: newDefenderHp }
      ),
      currentTurn: newStatus === "active" ? (isPlayer1Turn ? "player2" : "player1") : battle.currentTurn,
      status: newStatus,
      battleLog: newLog,
    });
  },
});

export const getBattle = query({
  args: { id: v.id("battles") },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.id);
    if (!battle) return null;

    const [pokemon1, pokemon2] = await Promise.all([
      ctx.db.get(battle.player1Pokemon),
      ctx.db.get(battle.player2Pokemon),
    ]);

    return {
      ...battle,
      pokemon1,
      pokemon2,
    };
  },
});