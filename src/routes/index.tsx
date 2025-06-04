import { useAction, useMutation, useQuery, Authenticated } from "convex/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Swords, Sparkles, ImageIcon, Search, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getStatAdjective, getStatColor } from "../utils/pokemonStats";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [playerTeam, setPlayerTeam] = useState<Id<"pokemon">[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<Id<"pokemon">[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<{ player: Id<"pokemon"> | null, opponent: Id<"pokemon"> | null }>({
    player: null,
    opponent: null,
  });
  const [battleMode, setBattleMode] = useState<"random" | "collection">("random");
  const [showPokemonSelection, setShowPokemonSelection] = useState(false);
  const [selectedCollectionPokemon, setSelectedCollectionPokemon] = useState<Id<"pokemon">[]>([]);
  const [isGeneratingTeams, setIsGeneratingTeams] = useState(false);

  const navigate = useNavigate();
  const generateTeam = useAction(api.pokemon.generateTeam);
  const createBattle = useMutation(api.battles.createBattle);
  const userCollection = useQuery(api.users.getUserCollection) || [];

  const handleGenerateTeams = async () => {
    setIsGeneratingTeams(true);
    try {
      const [team1, team2] = await Promise.all([
        generateTeam({}),
        generateTeam({}),
      ]);
      
      setPlayerTeam(team1 as Id<"pokemon">[]);
      setOpponentTeam(team2 as Id<"pokemon">[]);
      setSelectedPokemon({ player: team1[0] as Id<"pokemon">, opponent: team2[0] as Id<"pokemon"> });
    } catch (error) {
      console.error("Error generating teams:", error);
    } finally {
      setIsGeneratingTeams(false);
    }
  };

  const handleUseCollection = () => {
    if (userCollection.length >= 3) {
      if (userCollection.length === 3) {
        // Use all 3 Pokemon from collection for player
        setPlayerTeam(userCollection);
        setSelectedPokemon(prev => ({ ...prev, player: userCollection[0] }));
        setBattleMode("collection");
        
        // Generate random team for opponent
        void generateTeam({}).then((team2) => {
          setOpponentTeam(team2 as Id<"pokemon">[]);
          setSelectedPokemon(prev => ({ ...prev, opponent: team2[0] as Id<"pokemon"> }));
        });
      } else {
        // Show Pokemon selection interface
        setShowPokemonSelection(true);
        setSelectedCollectionPokemon([]);
        setBattleMode("collection");
      }
    }
  };

  const handlePokemonSelectionToggle = (pokemonId: Id<"pokemon">) => {
    setSelectedCollectionPokemon(prev => {
      if (prev.includes(pokemonId)) {
        return prev.filter(id => id !== pokemonId);
      } else if (prev.length < 3) {
        return [...prev, pokemonId];
      }
      return prev;
    });
  };

  const handleConfirmPokemonSelection = async () => {
    if (selectedCollectionPokemon.length === 3) {
      setPlayerTeam(selectedCollectionPokemon);
      setSelectedPokemon(prev => ({ ...prev, player: selectedCollectionPokemon[0] }));
      setShowPokemonSelection(false);
      
      // Generate random team for opponent
      const team2 = await generateTeam({});
      setOpponentTeam(team2 as Id<"pokemon">[]);
      setSelectedPokemon(prev => ({ ...prev, opponent: team2[0] as Id<"pokemon"> }));
    }
  };

  const resetBattleSetup = () => {
    setPlayerTeam([]);
    setOpponentTeam([]);
    setSelectedPokemon({ player: null, opponent: null });
    setBattleMode("random");
    setShowPokemonSelection(false);
    setSelectedCollectionPokemon([]);
  };

  const handleStartBattle = async () => {
    if (!selectedPokemon.player || !selectedPokemon.opponent) return;
    
    const newBattleId = await createBattle({
      player1Team: playerTeam,
      player2Team: opponentTeam,
      player1Pokemon: selectedPokemon.player,
      player2Pokemon: selectedPokemon.opponent,
    });
    
    // Navigate directly to the battle
    void navigate({ to: `/battle/${newBattleId}` });
  };

  return (
    <div className="text-center">
      <div className="not-prose flex justify-center mb-4">
        <Swords className="w-16 h-16 text-primary" />
      </div>
      <h1 className="mt-0">PokemonAI Battle Simulator</h1>
      <p>AI-generated Pokemon battles with custom creatures!</p>

      <div className="not-prose mt-8">
        {showPokemonSelection ? (
          <PokemonSelectionInterface 
            userCollection={userCollection}
            selectedPokemon={selectedCollectionPokemon}
            onTogglePokemon={handlePokemonSelectionToggle}
            onConfirm={() => void handleConfirmPokemonSelection()}
            onCancel={() => {
              setShowPokemonSelection(false);
              setBattleMode("random");
            }}
          />
        ) : playerTeam.length === 0 ? (
          <div className="space-y-6 max-w-md mx-auto">
            {/* Random Battle Mode */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Random Battle</h2>
                <p>Generate two teams of AI Pokemon and start battling!</p>
                <div className="card-actions justify-center">
                  <button 
                    className="btn btn-primary btn-lg gap-2"
                    onClick={() => void handleGenerateTeams()}
                    disabled={isGeneratingTeams}
                  >
                    {isGeneratingTeams ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Generating Teams...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Teams
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Collection Battle Mode */}
            <Authenticated>
              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title">Collection Battle</h2>
                  <p>Battle using your caught Pokemon collection!</p>
                  <div className="text-xs opacity-70 mb-3">
                    Collection: {userCollection.length} Pokemon
                  </div>
                  <div className="card-actions justify-center">
                    <button 
                      className="btn btn-accent btn-lg gap-2"
                      onClick={handleUseCollection}
                      disabled={userCollection.length < 3}
                    >
                      <Users className="w-5 h-5" />
                      Use Collection
                    </button>
                    {userCollection.length < 3 && (
                      <div className="text-xs opacity-70 mt-2">
                        Need at least 3 Pokemon
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Authenticated>

            {/* Catch Mode */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">Catch Mode</h2>
                <p>Discover and catch wild AI-generated Pokemon!</p>
                <div className="card-actions justify-center">
                  <Link 
                    to="/catch"
                    className="btn btn-secondary btn-lg gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Start Catching
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="alert alert-info">
              <span>
                {battleMode === "collection" 
                  ? "Using your Pokemon collection vs AI team" 
                  : "Random AI teams generated"}
              </span>
            </div>

            <TeamSelector 
              label="Your Team"
              team={playerTeam}
              selected={selectedPokemon.player}
              onSelect={(id) => setSelectedPokemon(prev => ({ ...prev, player: id }))}
            />
            
            <TeamSelector 
              label="Opponent Team" 
              team={opponentTeam}
              selected={selectedPokemon.opponent}
              onSelect={(id) => setSelectedPokemon(prev => ({ ...prev, opponent: id }))}
            />

            <div className="flex gap-4 justify-center">
              <button 
                className="btn btn-outline"
                onClick={resetBattleSetup}
              >
                <Sparkles className="w-4 h-4" />
                Back to Setup
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={() => void handleStartBattle()}
                disabled={!selectedPokemon.player || !selectedPokemon.opponent}
              >
                <Swords className="w-4 h-4" />
                Start Battle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSelector({ 
  label, 
  team, 
  selected, 
  onSelect 
}: { 
  label: string;
  team: Id<"pokemon">[];
  selected: Id<"pokemon"> | null;
  onSelect: (id: Id<"pokemon">) => void;
}) {
  return (
    <div>
      <h3 className="mb-3">{label}</h3>
      <div className="flex gap-3 justify-center">
        {team.map((pokemonId) => (
          <PokemonCard 
            key={pokemonId}
            pokemonId={pokemonId}
            isSelected={selected === pokemonId}
            onClick={() => onSelect(pokemonId)}
          />
        ))}
      </div>
    </div>
  );
}

function PokemonCard({ 
  pokemonId, 
  isSelected, 
  onClick
}: { 
  pokemonId: Id<"pokemon">;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pokemon = useQuery(api.pokemon.getPokemon, { id: pokemonId });

  if (!pokemon) {
    return (
      <div className="card bg-base-100 w-40 cursor-pointer animate-pulse">
        <div className="card-body p-3">
          <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-base-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`card bg-base-100 w-40 cursor-pointer transition-all hover:scale-105 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <div className="card-body p-3">
        <div className="text-sm font-bold truncate">{pokemon.name} <span className="font-normal opacity-70">Lv.{pokemon.level || 5}</span></div>
        
        {/* Pokemon Image */}
        <PokemonImageSmall 
          imageUrl={pokemon.imageUrl} 
          name={pokemon.name} 
        />
        
        <div className="flex gap-1 mb-2">
          {pokemon.types.map((type: string) => (
            <span key={type} className="badge badge-primary badge-xs">
              {type}
            </span>
          ))}
        </div>
        <div className="text-xs space-y-1 opacity-80">
          <div className={getStatColor(pokemon.hp, 'hp')}>
            {getStatAdjective(pokemon.hp, 'hp')}
          </div>
          <div className={getStatColor(pokemon.attack, 'attack')}>
            {getStatAdjective(pokemon.attack, 'attack')}
          </div>
        </div>
      </div>
    </div>
  );
}

function PokemonImageSmall({ imageUrl, name }: { imageUrl?: string; name: string }) {
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
      <div className="flex justify-center my-2">
        <div className="w-16 h-16 rounded border border-base-300 bg-base-200 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-2">
      <div className="relative w-16 h-16">
        {isLoading && (
          <div className="absolute inset-0 rounded border border-base-300 bg-base-200 flex items-center justify-center">
            <div className="loading loading-spinner loading-xs"></div>
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={name}
          className={`w-16 h-16 rounded object-cover border border-base-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
        />
        {hasError && !isLoading && (
          <div className="absolute inset-0 rounded border border-base-300 bg-base-200 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 opacity-50" />
          </div>
        )}
      </div>
    </div>
  );
}

function PokemonSelectionInterface({ 
  userCollection, 
  selectedPokemon, 
  onTogglePokemon, 
  onConfirm, 
  onCancel 
}: {
  userCollection: Id<"pokemon">[];
  selectedPokemon: Id<"pokemon">[];
  onTogglePokemon: (id: Id<"pokemon">) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Select Your Battle Team</h2>
        <p>Choose 3 Pokemon from your collection to battle with</p>
        <div className="mt-2">
          <span className="text-sm opacity-70">
            Selected: {selectedPokemon.length}/3
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {userCollection.map((pokemonId) => (
          <SelectablePokemonCard
            key={pokemonId}
            pokemonId={pokemonId}
            isSelected={selectedPokemon.includes(pokemonId)}
            onToggle={() => onTogglePokemon(pokemonId)}
            disabled={!selectedPokemon.includes(pokemonId) && selectedPokemon.length >= 3}
          />
        ))}
      </div>

      <div className="flex gap-4 justify-center">
        <button 
          className="btn btn-outline"
          onClick={onCancel}
        >
          Cancel
        </button>
        
        <button 
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={selectedPokemon.length !== 3}
        >
          <Swords className="w-4 h-4" />
          Confirm Team
        </button>
      </div>
    </div>
  );
}

function SelectablePokemonCard({ 
  pokemonId, 
  isSelected, 
  onToggle, 
  disabled 
}: {
  pokemonId: Id<"pokemon">;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const pokemon = useQuery(api.pokemon.getPokemon, { id: pokemonId });

  if (!pokemon) {
    return (
      <div className="card bg-base-100 animate-pulse">
        <div className="card-body p-3">
          <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-base-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`card bg-base-100 cursor-pointer transition-all hover:scale-105 ${
        isSelected ? "ring-2 ring-primary bg-primary/10" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={disabled ? undefined : onToggle}
    >
      <div className="card-body p-3">
        <div className="font-bold text-sm truncate">{pokemon.name} <span className="font-normal opacity-70">Lv.{pokemon.level || 5}</span></div>
        
        {/* Pokemon Image */}
        <PokemonImageSmall 
          imageUrl={pokemon.imageUrl} 
          name={pokemon.name} 
        />
        
        <div className="flex gap-1 mb-2">
          {pokemon.types.map((type: string) => (
            <span key={type} className="badge badge-primary badge-xs">
              {type}
            </span>
          ))}
        </div>
        <div className="text-xs space-y-1 opacity-80">
          <div className={getStatColor(pokemon.hp, 'hp')}>
            HP: {getStatAdjective(pokemon.hp, 'hp')}
          </div>
          <div className={getStatColor(pokemon.attack, 'attack')}>
            ATK: {getStatAdjective(pokemon.attack, 'attack')}
          </div>
        </div>
        
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-content text-xs font-bold">✓</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
