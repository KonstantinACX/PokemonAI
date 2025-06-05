import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SignInButton } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { ArrowLeft, Users, Search, Clock, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/multiplayer")({
  component: MultiplayerPageWrapper,
});

function MultiplayerPageWrapper() {
  return (
    <>
      <Authenticated>
        <MultiplayerPage />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedMultiplayerPage />
      </Unauthenticated>
    </>
  );
}

function UnauthenticatedMultiplayerPage() {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="not-prose mb-4">
        <Link to="/" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <h1 className="mt-0">Multiplayer Battles</h1>
      <p className="mb-6">Battle against other players in real-time!</p>
      
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="mb-4">
            <Users className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h2 className="card-title justify-center">Sign In Required</h2>
          <p>Create an account to:</p>
          <ul className="text-left list-disc list-inside space-y-1 opacity-70">
            <li>Battle against other players online</li>
            <li>Join the matchmaking queue</li>
            <li>Track your wins and losses</li>
            <li>Use your Pokemon collection in battles</li>
          </ul>
          <div className="card-actions justify-center mt-4">
            <SignInButton mode="modal">
              <button className="btn btn-primary gap-2">
                <Users className="w-4 h-4" />
                Sign In to Battle
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function MultiplayerPage() {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState<Id<"pokemon">[]>([]);
  
  const userCollection = useQuery(api.users.getUserCollection) || [];
  const queueStatus = useQuery(api.multiplayer.getQueueStatus);
  const currentBattle = useQuery(api.multiplayer.getCurrentBattle);
  
  const joinQueue = useMutation(api.multiplayer.joinBattleQueue);
  const leaveQueue = useMutation(api.multiplayer.leaveBattleQueue);

  // Check if player has a current battle and redirect
  useEffect(() => {
    if (currentBattle) {
      void navigate({ to: `/battle/${currentBattle._id}` });
    }
  }, [currentBattle, navigate]);

  const handleJoinQueue = async () => {
    if (selectedTeam.length !== 3) {
      alert("Please select exactly 3 Pokemon for your team");
      return;
    }

    try {
      await joinQueue({
        team: selectedTeam,
        preferences: undefined, // Add preferences later
      });
    } catch (error) {
      console.error("Error joining queue:", error);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await leaveQueue({});
    } catch (error) {
      console.error("Error leaving queue:", error);
    }
  };

  const handlePokemonToggle = (pokemonId: Id<"pokemon">) => {
    setSelectedTeam(prev => {
      if (prev.includes(pokemonId)) {
        return prev.filter(id => id !== pokemonId);
      } else if (prev.length < 3) {
        return [...prev, pokemonId];
      }
      return prev;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="not-prose mb-4">
        <Link to="/" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="text-center mb-6">
        <h1 className="mt-0">Multiplayer Battles</h1>
        <p>Battle against other players in real-time!</p>
      </div>

      {queueStatus ? (
        <QueueStatusCard
          queueStatus={queueStatus}
          onLeaveQueue={() => void handleLeaveQueue()}
        />
      ) : (
        <TeamSelectionCard
          userCollection={userCollection}
          selectedTeam={selectedTeam}
          onPokemonToggle={handlePokemonToggle}
          onJoinQueue={() => void handleJoinQueue()}
        />
      )}
    </div>
  );
}

function QueueStatusCard({ 
  queueStatus, 
  onLeaveQueue 
}: { 
  queueStatus: any; 
  onLeaveQueue: () => void;
}) {
  const formatWaitTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body text-center">
        <div className="mb-4">
          <Search className="w-16 h-16 mx-auto animate-pulse text-primary" />
        </div>
        
        <h2 className="card-title justify-center">Searching for Opponent...</h2>
        
        <div className="stats bg-base-100 shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Clock className="w-8 h-8" />
            </div>
            <div className="stat-title">Wait Time</div>
            <div className="stat-value text-primary">{formatWaitTime(queueStatus.waitTime)}</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-title">Queue Position</div>
            <div className="stat-value text-secondary">#{queueStatus.position}</div>
          </div>
        </div>

        <p className="text-sm opacity-70 mb-4">
          We're finding you the perfect opponent. This usually takes less than a minute!
        </p>

        <button 
          className="btn btn-outline btn-error"
          onClick={onLeaveQueue}
        >
          Leave Queue
        </button>
      </div>
    </div>
  );
}

function TeamSelectionCard({
  userCollection,
  selectedTeam,
  onPokemonToggle,
  onJoinQueue,
}: {
  userCollection: Id<"pokemon">[];
  selectedTeam: Id<"pokemon">[];
  onPokemonToggle: (id: Id<"pokemon">) => void;
  onJoinQueue: () => void;
}) {
  if (userCollection.length < 3) {
    return (
      <div className="card bg-base-200">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">Not Enough Pokemon</h2>
          <p>You need at least 3 Pokemon in your collection to battle online.</p>
          <p className="text-sm opacity-70">Current collection: {userCollection.length} Pokemon</p>
          
          <div className="card-actions justify-center mt-4">
            <Link to="/catch" className="btn btn-primary gap-2">
              <Search className="w-4 h-4" />
              Catch More Pokemon
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Select Your Battle Team</h2>
          <p>Choose 3 Pokemon from your collection to battle with</p>
          
          <div className="mt-2 mb-4">
            <span className="text-sm opacity-70">
              Selected: {selectedTeam.length}/3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCollection.map((pokemonId) => (
              <SelectablePokemonCard
                key={pokemonId}
                pokemonId={pokemonId}
                isSelected={selectedTeam.includes(pokemonId)}
                onToggle={() => onPokemonToggle(pokemonId)}
                disabled={!selectedTeam.includes(pokemonId) && selectedTeam.length >= 3}
              />
            ))}
          </div>

          <div className="card-actions justify-center mt-6">
            <button 
              className="btn btn-primary btn-lg gap-2"
              onClick={onJoinQueue}
              disabled={selectedTeam.length !== 3}
            >
              <Zap className="w-5 h-5" />
              Join Battle Queue
            </button>
          </div>
        </div>
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
        <div className="font-bold text-sm truncate">
          {pokemon.name} <span className="font-normal opacity-70">Lv.{pokemon.level || 5}</span>
        </div>
        
        <div className="flex gap-1 mb-2">
          {pokemon.types.map((type: string) => (
            <span key={type} className="badge badge-primary badge-xs">
              {type}
            </span>
          ))}
        </div>
        
        <div className="text-xs space-y-1 opacity-80">
          <div>HP: {pokemon.hp}</div>
          <div>ATK: {pokemon.attack}</div>
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