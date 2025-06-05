import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, Heart, Shield, Sword, Zap, ImageIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getStatAdjective, getStatColor } from "../utils/pokemonStats";

// XP calculation helpers
const XP_TABLE = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450
];

function getXpForCurrentLevel(level: number): number {
  return XP_TABLE[Math.max(0, Math.min(level - 1, XP_TABLE.length - 1))];
}

function getXpForNextLevel(level: number): number {
  if (level >= 20) return XP_TABLE[XP_TABLE.length - 1]; // Max level
  return XP_TABLE[Math.min(level, XP_TABLE.length - 1)];
}

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
  
  // For multiplayer battles, get player names
  const player1 = battle?.battleType === "multiplayer" && battle?.player1Id 
    ? useQuery(api.users.getUser, { userId: battle.player1Id })
    : null;
  const player2 = battle?.battleType === "multiplayer" && battle?.player2Id 
    ? useQuery(api.users.getUser, { userId: battle.player2Id })
    : null;
  const [showSwitchOptions, setShowSwitchOptions] = useState(false);
  const [levelUpNotifications, setLevelUpNotifications] = useState<Array<{
    pokemonName: string;
    oldLevel: number;
    newLevel: number;
    xpGained: number;
  }>>([]);

  const handleMove = useCallback(async (moveIndex: number) => {
    await performMove({
      battleId: battleId as Id<"battles">,
      moveIndex,
    });
  }, [performMove, battleId]);

  const handleSwitchPokemon = useCallback(async (pokemonId: Id<"pokemon">) => {
    await switchPokemon({
      battleId: battleId as Id<"battles">,
      pokemonId,
    });
  }, [switchPokemon, battleId]);

  const isPlayerTurn = battle?.currentTurn === "player1";
  const currentPokemon = isPlayerTurn ? battle?.pokemon1 : battle?.pokemon2;
  const isGameOver = battle?.status === "player1_wins" || battle?.status === "player2_wins";
  const isPlayerSelecting = battle?.status === "player1_selecting";
  const isOpponentSelecting = battle?.status === "player2_selecting";
  const isActive = battle?.status === "active";

  // Auto-trigger AI move when it's opponent's turn or AI needs to select Pokemon (AI battles only)
  useEffect(() => {
    if (battle?.battleType === "ai" && ((!isPlayerTurn && isActive) || isOpponentSelecting)) {
      // Add a small delay to make the AI move feel more natural
      const timer = setTimeout(() => {
        if (isOpponentSelecting) {
          // AI needs to select a new Pokemon
          const availablePokemon = battle.player2Team.filter((pokemon): pokemon is NonNullable<typeof pokemon> => 
            pokemon !== null && 
            !battle.player2FaintedPokemon.includes(pokemon._id) && 
            pokemon._id !== battle.player2ActivePokemon
          );
          if (availablePokemon.length > 0) {
            const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
            void handleSwitchPokemon(randomPokemon._id);
          }
        } else {
          void performAIMove({ battleId: battleId as Id<"battles"> });
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, isActive, isOpponentSelecting, performAIMove, battleId, battle, handleSwitchPokemon]);

  // Check for battle end and show level-up notifications
  useEffect(() => {
    if (battle?.status === "player1_wins" || battle?.status === "player2_wins") {
      // TODO: Get actual level-up results from backend
      // For now, we'll show notifications when the XP awarding system is properly integrated
      console.log("Battle ended, XP should be awarded to Pokemon");
    }
  }, [battle?.status]);

  if (!battle) {
    return <div>Battle not found</div>;
  }

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
              label={battle.battleType === "multiplayer" && player1 
                ? `${player1.name || "Player 1"}` 
                : "Your Pokemon"}
              statusEffect={battle.player1StatusEffect}
            />
            <PokemonDisplay
              pokemon={battle.pokemon2}
              currentHp={battle.player2ActiveHp}
              isActive={!isPlayerTurn}
              label={battle.battleType === "multiplayer" && player2 
                ? `${player2.name || "Player 2"}` 
                : "Opponent"}
              statusEffect={battle.player2StatusEffect}
            />
          </div>

          {!isGameOver && (
            <div className="mb-6">
              {isPlayerSelecting && (
                <div>
                  <h3 className="text-center mb-4 text-warning">
                    Choose your next Pokemon!
                  </h3>
                  <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
                    {battle.player1Team
                      .filter((pokemon): pokemon is NonNullable<typeof pokemon> => 
                        pokemon !== null && 
                        !battle.player1FaintedPokemon.includes(pokemon._id) && 
                        pokemon._id !== battle.player1ActivePokemon
                      )
                      .map((pokemon) => (
                        <button
                          key={pokemon._id}
                          className="btn btn-outline min-w-0 h-auto py-3 px-2"
                          onClick={() => void handleSwitchPokemon(pokemon._id)}
                        >
                          <div className="text-center w-full">
                            <div className="font-bold text-xs mb-1">
                              <div className="truncate">{pokemon.name}</div>
                              <div className="font-normal opacity-70">Lv.{pokemon.level || 5}</div>
                            </div>
                            <div className="flex gap-1 justify-center mb-1 flex-wrap">
                              {pokemon.types.map((type: string) => (
                                <span key={type} className="badge badge-primary badge-xs">
                                  {type}
                                </span>
                              ))}
                            </div>
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
                            onClick={() => void handleMove(index)}
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
                      {battle.player1Team.filter((pokemon): pokemon is NonNullable<typeof pokemon> => 
                        pokemon !== null && 
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
                              <div className="grid grid-cols-2 gap-3">
                                {battle.player1Team
                                  .filter((pokemon): pokemon is NonNullable<typeof pokemon> => 
                                    pokemon !== null && 
                                    !battle.player1FaintedPokemon.includes(pokemon._id) && 
                                    pokemon._id !== battle.player1ActivePokemon
                                  )
                                  .map((pokemon) => (
                                    <button
                                      key={pokemon._id}
                                      className="btn btn-outline btn-sm min-w-0 h-auto py-2 px-2"
                                      onClick={() => {
                                        void handleSwitchPokemon(pokemon._id);
                                        setShowSwitchOptions(false);
                                      }}
                                    >
                                      <div className="text-center w-full">
                                        <div className="font-bold text-xs mb-1">
                                          <div className="truncate">{pokemon.name}</div>
                                          <div className="font-normal opacity-70">Lv.{pokemon.level || 5}</div>
                                        </div>
                                        <div className="flex gap-1 justify-center mb-1 flex-wrap">
                                          {pokemon.types.map((type: string) => (
                                            <span key={type} className="badge badge-primary badge-xs">
                                              {type}
                                            </span>
                                          ))}
                                        </div>
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

      {/* Level Up Notifications */}
      <LevelUpNotifications 
        notifications={levelUpNotifications}
        onDismiss={() => {
          console.log("Clearing level up notifications");
          setLevelUpNotifications([]);
        }}
      />
    </div>
  );
}

function PokemonDisplay({ 
  pokemon, 
  currentHp, 
  isActive, 
  label,
  statusEffect
}: {
  pokemon: any;
  currentHp: number;
  isActive: boolean;
  label: string;
  statusEffect?: string;
}) {
  if (!pokemon) return null;

  const hpPercentage = (currentHp / pokemon.hp) * 100;
  const hpColor = hpPercentage > 60 ? "success" : hpPercentage > 30 ? "warning" : "error";

  return (
    <div className={`card bg-base-100 ${isActive ? "ring-2 ring-primary" : ""}`}>
      <div className="card-body">
        <div className="card-title text-sm opacity-70">{label}</div>
        
        <h3 className="text-lg font-bold">{pokemon.name} <span className="text-sm font-normal opacity-70">Lv.{pokemon.level || 5}</span></h3>
        
        {/* Pokemon Image */}
        <PokemonImage 
          imageUrl={pokemon.imageUrl} 
          name={pokemon.name} 
        />
        
        <div className="flex gap-1 mb-3">
          {pokemon.types.map((type: string) => (
            <span key={type} className="badge badge-primary badge-sm">
              {type}
            </span>
          ))}
        </div>

        {/* Status Effect Display */}
        {statusEffect && (
          <div className="mb-3">
            <StatusEffectBadge statusEffect={statusEffect} />
          </div>
        )}

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

          {/* XP Progress Bar */}
          <div>
            <div className="flex justify-between text-xs opacity-70">
              <span>XP</span>
              <span>{pokemon.xp || 0} / {getXpForNextLevel(pokemon.level || 5)}</span>
            </div>
            <progress 
              className="progress progress-info w-full h-1" 
              value={(pokemon.xp || 0) - getXpForCurrentLevel(pokemon.level || 5)}
              max={getXpForNextLevel(pokemon.level || 5) - getXpForCurrentLevel(pokemon.level || 5)}
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

function PokemonImage({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!imageUrl) {
    return (
      <div className="flex justify-center mb-3">
        <div className="w-24 h-24 rounded-lg border-2 border-base-300 bg-base-200 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-3">
      <div className="relative w-24 h-24">
        {isLoading && (
          <div className="absolute inset-0 rounded-lg border-2 border-base-300 bg-base-200 flex items-center justify-center">
            <div className="loading loading-spinner loading-sm"></div>
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={name}
          className={`w-24 h-24 rounded-lg object-cover border-2 border-base-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
        />
        {hasError && !isLoading && (
          <div className="absolute inset-0 rounded-lg border-2 border-base-300 bg-base-200 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 opacity-50" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusEffectBadge({ statusEffect }: { statusEffect: string }) {
  const statusConfig: Record<string, { color: string; icon: string; name: string }> = {
    poison: { color: "badge-error", icon: "☠️", name: "Poisoned" },
    burn: { color: "badge-warning", icon: "🔥", name: "Burned" },
    paralyze: { color: "badge-info", icon: "⚡", name: "Paralyzed" },
    freeze: { color: "badge-accent", icon: "❄️", name: "Frozen" },
    sleep: { color: "badge-neutral", icon: "💤", name: "Asleep" },
  };

  const config = statusConfig[statusEffect];
  if (!config) return null;

  return (
    <div className={`badge ${config.color} badge-sm gap-1`}>
      <span>{config.icon}</span>
      <span>{config.name}</span>
    </div>
  );
}

function LevelUpNotifications({ 
  notifications, 
  onDismiss 
}: { 
  notifications: Array<{
    pokemonName: string;
    oldLevel: number;
    newLevel: number;
    xpGained: number;
  }>;
  onDismiss: () => void;
}) {
  if (notifications.length === 0) return null;

  const handleDismiss = () => {
    console.log("Dismissing level up notifications");
    onDismiss();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={handleBackdropClick}
    >
      <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4 text-center">🎉 Level Up!</h3>
        
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <div key={index} className="bg-success/20 p-3 rounded-lg">
              <div className="font-bold text-center text-success">
                {notification.pokemonName}
              </div>
              <div className="text-center text-sm">
                Level {notification.oldLevel} → Level {notification.newLevel}
              </div>
              <div className="text-center text-xs opacity-70">
                +{notification.xpGained} XP gained!
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-4">
          <button 
            className="btn btn-primary"
            onClick={handleDismiss}
            type="button"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
