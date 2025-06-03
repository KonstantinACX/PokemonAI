import { useMutation } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Swords, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

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

  const generateTeam = useMutation(api.pokemon.generateTeam);
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
  return (
    <div 
      className={`card bg-base-100 w-32 cursor-pointer transition-all hover:scale-105 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <div className="card-body p-4">
        <div className="text-sm font-bold">Pokemon #{index}</div>
        <div className="text-xs opacity-70">Click to select</div>
      </div>
    </div>
  );
}

function BattleLink({ battleId }: { battleId: Id<"battles"> }) {
  return (
    <a 
      href={`/battle/${battleId}`}
      className="btn btn-success"
    >
      <Swords className="w-4 h-4" />
      Enter Battle
    </a>
  );
}
