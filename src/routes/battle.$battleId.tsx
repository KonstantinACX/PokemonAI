import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, Heart, Shield, Sword, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const battleQueryOptions = (battleId: Id<"battles">) => 
  convexQuery(api.battles.getBattle, { id: battleId });

export const Route = createFileRoute("/battle/$battleId")({
  loader: async ({ context: { queryClient }, params }) =>
    await queryClient.ensureQueryData(battleQueryOptions(params.battleId as Id<"battles">)),
  component: BattlePage,
});

function BattlePage() {
  const { battleId } = Route.useParams();
  const { data: battle } = useSuspenseQuery(battleQueryOptions(battleId as Id<"battles">));
  const performMove = useMutation(api.battles.performMove);

  if (!battle) {
    return <div>Battle not found</div>;
  }

  const handleMove = async (moveIndex: number) => {
    await performMove({
      battleId: battleId as Id<"battles">,
      moveIndex,
    });
  };

  const isPlayerTurn = battle.currentTurn === "player1";
  const currentPokemon = isPlayerTurn ? battle.pokemon1 : battle.pokemon2;
  const isGameOver = battle.status !== "active";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="not-prose mb-4">
        <Link to="/" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h1 className="card-title text-center mb-6">
            {battle.pokemon1?.name} vs {battle.pokemon2?.name}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <PokemonDisplay
              pokemon={battle.pokemon1}
              currentHp={battle.player1Hp}
              isActive={isPlayerTurn}
              label="Your Pokemon"
            />
            <PokemonDisplay
              pokemon={battle.pokemon2}
              currentHp={battle.player2Hp}
              isActive={!isPlayerTurn}
              label="Opponent"
            />
          </div>

          {!isGameOver && (
            <div className="mb-6">
              <h3 className="text-center mb-4">
                {isPlayerTurn ? "Choose your move!" : "Opponent is choosing..."}
              </h3>
              
              {isPlayerTurn && currentPokemon && (
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  {currentPokemon.moves.map((move, index) => (
                    <button
                      key={index}
                      className="btn btn-outline"
                      onClick={() => handleMove(index)}
                    >
                      <div className="text-left">
                        <div className="font-bold">{move.name}</div>
                        <div className="text-xs opacity-70">
                          {move.type} • {move.power} PWR
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isGameOver && (
            <div className="text-center mb-6">
              <div className="alert alert-success">
                <h3 className="font-bold">
                  {battle.status === "player1_wins" ? "You Win!" : "You Lose!"}
                </h3>
              </div>
              <Link to="/" className="btn btn-primary mt-4">
                New Battle
              </Link>
            </div>
          )}

          <div className="divider">Battle Log</div>
          
          <div className="bg-base-100 p-4 rounded-lg max-h-48 overflow-y-auto">
            {battle.battleLog.map((log, index) => (
              <div key={index} className="text-sm mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PokemonDisplay({ 
  pokemon, 
  currentHp, 
  isActive, 
  label 
}: {
  pokemon: any;
  currentHp: number;
  isActive: boolean;
  label: string;
}) {
  if (!pokemon) return null;

  const hpPercentage = (currentHp / pokemon.hp) * 100;
  const hpColor = hpPercentage > 60 ? "success" : hpPercentage > 30 ? "warning" : "error";

  return (
    <div className={`card bg-base-100 ${isActive ? "ring-2 ring-primary" : ""}`}>
      <div className="card-body">
        <div className="card-title text-sm opacity-70">{label}</div>
        
        <h3 className="text-lg font-bold">{pokemon.name}</h3>
        
        <div className="flex gap-1 mb-3">
          {pokemon.types.map((type: string) => (
            <span key={type} className="badge badge-primary badge-sm">
              {type}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm">
              <span>HP</span>
              <span>{currentHp}/{pokemon.hp}</span>
            </div>
            <progress 
              className={`progress progress-${hpColor} w-full`} 
              value={currentHp} 
              max={pokemon.hp}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Sword className="w-3 h-3" />
              <span>ATK: {pokemon.attack}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>DEF: {pokemon.defense}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>SPD: {pokemon.speed}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>HP: {pokemon.hp}</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs opacity-70 mb-1">Moves:</div>
          <div className="space-y-1">
            {pokemon.moves.map((move: any, index: number) => (
              <div key={index} className="text-xs bg-base-200 p-1 rounded">
                <span className="font-semibold">{move.name}</span>
                <span className="opacity-70"> ({move.type}, {move.power} PWR)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}