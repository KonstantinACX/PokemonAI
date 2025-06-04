import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, Heart, Shield, Sword, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getStatAdjective, getStatColor } from "../utils/pokemonStats";

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
  const performAIMove = useMutation(api.battles.performAIMove);
  const switchPokemon = useMutation(api.battles.switchPokemon);
  const [showSwitchOptions, setShowSwitchOptions] = useState(false);

  if (!battle) {
    return <div>Battle not found</div>;
  }

  const handleMove = async (moveIndex: number) => {
    await performMove({
      battleId: battleId as Id<"battles">,
      moveIndex,
    });
  };

  const handleSwitchPokemon = async (pokemonId: Id<"pokemon">) => {
    await switchPokemon({
      battleId: battleId as Id<"battles">,
      pokemonId,
    });
  };

  const isPlayerTurn = battle.currentTurn === "player1";
  const currentPokemon = isPlayerTurn ? battle.pokemon1 : battle.pokemon2;
  const isGameOver = battle.status === "player1_wins" || battle.status === "player2_wins";
  const isPlayerSelecting = battle.status === "player1_selecting";
  const isOpponentSelecting = battle.status === "player2_selecting";
  const isActive = battle.status === "active";

  // Auto-trigger AI move when it's opponent's turn or AI needs to select Pokemon
  useEffect(() => {
    if ((!isPlayerTurn && isActive) || isOpponentSelecting) {
      // Add a small delay to make the AI move feel more natural
      const timer = setTimeout(() => {
        if (isOpponentSelecting) {
          // AI needs to select a new Pokemon
          const availablePokemon = battle.player2Team.filter(pokemon => 
            !battle.player2FaintedPokemon.includes(pokemon._id) && 
            pokemon._id !== battle.player2ActivePokemon
          );
          if (availablePokemon.length > 0) {
            const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
            handleSwitchPokemon(randomPokemon._id);
          }
        } else {
          performAIMove({ battleId: battleId as Id<"battles"> });
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, isActive, isOpponentSelecting, performAIMove, battleId, battle, handleSwitchPokemon]);

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
              currentHp={battle.player1ActiveHp}
              isActive={isPlayerTurn}
              label="Your Pokemon"
            />
            <PokemonDisplay
              pokemon={battle.pokemon2}
              currentHp={battle.player2ActiveHp}
              isActive={!isPlayerTurn}
              label="Opponent"
            />
          </div>

          {!isGameOver && (
            <div className="mb-6">
              {isPlayerSelecting && (
                <div>
                  <h3 className="text-center mb-4 text-warning">
                    Choose your next Pokemon!
                  </h3>
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    {battle.player1Team
                      .filter(pokemon => 
                        !battle.player1FaintedPokemon.includes(pokemon._id) && 
                        pokemon._id !== battle.player1ActivePokemon
                      )
                      .map((pokemon) => (
                        <button
                          key={pokemon._id}
                          className="btn btn-outline"
                          onClick={() => handleSwitchPokemon(pokemon._id)}
                        >
                          <div className="text-center">
                            <div className="font-bold text-sm">{pokemon.name}</div>
                            <div className="text-xs opacity-70">
                              HP: {pokemon.hp}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
              
              {isOpponentSelecting && (
                <h3 className="text-center mb-4">
                  Opponent is choosing their next Pokemon...
                </h3>
              )}
              
              {isActive && (
                <div>
                  <h3 className="text-center mb-4">
                    {isPlayerTurn ? "Choose your action!" : "Opponent is choosing..."}
                  </h3>
                  
                  {isPlayerTurn && currentPokemon && (
                    <div className="space-y-4">
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
                                {move.type} • {move.power === 0 ? "STATUS" : `${move.power} PWR`}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Pokemon Switching Option */}
                      {battle.player1Team.filter(pokemon => 
                        !battle.player1FaintedPokemon.includes(pokemon._id) && 
                        pokemon._id !== battle.player1ActivePokemon
                      ).length > 0 && (
                        <div className="text-center">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowSwitchOptions(!showSwitchOptions)}
                          >
                            Switch Pokemon
                          </button>
                          
                          {showSwitchOptions && (
                            <div className="mt-3 p-3 bg-base-200 rounded-lg">
                              <div className="text-sm mb-2 opacity-70">Choose Pokemon to switch to:</div>
                              <div className="grid grid-cols-2 gap-2">
                                {battle.player1Team
                                  .filter(pokemon => 
                                    !battle.player1FaintedPokemon.includes(pokemon._id) && 
                                    pokemon._id !== battle.player1ActivePokemon
                                  )
                                  .map((pokemon) => (
                                    <button
                                      key={pokemon._id}
                                      className="btn btn-outline btn-sm"
                                      onClick={() => {
                                        handleSwitchPokemon(pokemon._id);
                                        setShowSwitchOptions(false);
                                      }}
                                    >
                                      <div className="text-center">
                                        <div className="font-bold text-xs">{pokemon.name}</div>
                                        <div className="text-xs opacity-70">
                                          HP: {pokemon.hp}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
            {battle.battleLog.slice().reverse().map((log, index) => (
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
        
        {/* Pokemon Image */}
        {pokemon.imageUrl && (
          <div className="flex justify-center mb-3">
            <img 
              src={pokemon.imageUrl} 
              alt={pokemon.name}
              className="w-24 h-24 rounded-lg object-cover border-2 border-base-300"
            />
          </div>
        )}
        
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
              <span className={getStatColor(pokemon.attack, 'attack')}>
                {getStatAdjective(pokemon.attack, 'attack')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span className={getStatColor(pokemon.defense, 'defense')}>
                {getStatAdjective(pokemon.defense, 'defense')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span className={getStatColor(pokemon.speed, 'speed')}>
                {getStatAdjective(pokemon.speed, 'speed')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span className={getStatColor(pokemon.hp, 'hp')}>
                {getStatAdjective(pokemon.hp, 'hp')}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs opacity-70 mb-1">Moves:</div>
          <div className="space-y-1">
            {pokemon.moves.map((move: any, index: number) => (
              <div key={index} className="text-xs bg-base-200 p-1 rounded">
                <span className="font-semibold">{move.name}</span>
                <span className="opacity-70"> ({move.type}, {move.power === 0 ? "STATUS" : `${move.power} PWR`})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}