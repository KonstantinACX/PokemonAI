import { useAction, useMutation, useQuery } from "convex/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Swords, Sparkles, ImageIcon } from "lucide-react";
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
  const [battleId, setBattleId] = useState<Id<"battles"> | null>(null);

  const generateTeam = useAction(api.pokemon.generateTeam);
  const createBattle = useMutation(api.battles.createBattle);

  const handleGenerateTeams = async () => {
    const [team1, team2] = await Promise.all([
      generateTeam({}),
      generateTeam({}),
    ]);
    
    setPlayerTeam(team1);
    setOpponentTeam(team2);
    setSelectedPokemon({ player: team1[0], opponent: team2[0] });
    setBattleId(null);
  };

  const handleStartBattle = async () => {
    if (!selectedPokemon.player || !selectedPokemon.opponent) return;
    
    const newBattleId = await createBattle({
      player1Team: playerTeam,
      player2Team: opponentTeam,
      player1Pokemon: selectedPokemon.player,
      player2Pokemon: selectedPokemon.opponent,
    });
    setBattleId(newBattleId);
  };

  return (
    <div className="text-center">
      <div className="not-prose flex justify-center mb-4">
        <Swords className="w-16 h-16 text-primary" />
      </div>
      <h1 className="mt-0">PokemonAI Battle Simulator</h1>
      <p>AI-generated Pokemon battles with custom creatures!</p>

      <div className="not-prose mt-8">
        {playerTeam.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Ready to Battle?</h2>
              <p>Generate two teams of AI Pokemon and start battling!</p>
              <div className="card-actions justify-center">
                <button 
                  className="btn btn-primary btn-lg gap-2"
                  onClick={handleGenerateTeams}
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Teams
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
                onClick={handleGenerateTeams}
              >
                <Sparkles className="w-4 h-4" />
                New Teams
              </button>
              
              {battleId ? (
                <BattleLink battleId={battleId} />
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={handleStartBattle}
                  disabled={!selectedPokemon.player || !selectedPokemon.opponent}
                >
                  <Swords className="w-4 h-4" />
                  Start Battle
                </button>
              )}
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
        {team.map((pokemonId, index) => (
          <PokemonCard 
            key={pokemonId}
            pokemonId={pokemonId}
            isSelected={selected === pokemonId}
            onClick={() => onSelect(pokemonId)}
            index={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

function PokemonCard({ 
  pokemonId, 
  isSelected, 
  onClick, 
  index 
}: { 
  pokemonId: Id<"pokemon">;
  isSelected: boolean;
  onClick: () => void;
  index: number;
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
        <div className="text-sm font-bold truncate">{pokemon.name}</div>
        
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

function BattleLink({ battleId }: { battleId: Id<"battles"> }) {
  return (
    <Link 
      to={`/battle/${battleId}`}
      className="btn btn-success"
    >
      <Swords className="w-4 h-4" />
      Enter Battle
    </Link>
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
