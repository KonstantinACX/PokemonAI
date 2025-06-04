import { useAction, useQuery } from "convex/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Heart, Shield, Sword, Zap, ImageIcon, Search, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getStatAdjective, getStatColor } from "../utils/pokemonStats";

export const Route = createFileRoute("/catch")({
  component: CatchPage,
});

function CatchPage() {
  const [currentPokemonId, setCurrentPokemonId] = useState<Id<"pokemon"> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [caughtPokemon, setCaughtPokemon] = useState<Id<"pokemon">[]>([]);
  
  const generateWildPokemon = useAction(api.pokemon.generatePokemonWithImage);
  const currentPokemon = useQuery(api.pokemon.getPokemon, 
    currentPokemonId ? { id: currentPokemonId } : "skip"
  );

  const handleFindPokemon = async () => {
    setIsSearching(true);
    try {
      const pokemonId = await generateWildPokemon({});
      setCurrentPokemonId(pokemonId as Id<"pokemon">);
    } catch (error) {
      console.error("Error finding Pokemon:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCatchPokemon = () => {
    if (currentPokemonId) {
      setCaughtPokemon(prev => [...prev, currentPokemonId]);
      setCurrentPokemonId(null);
    }
  };

  const handleSkipPokemon = () => {
    setCurrentPokemonId(null);
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
        <h1 className="mt-0">Pokemon Catching</h1>
        <p>Discover and catch wild AI-generated Pokemon!</p>
      </div>

      {/* Caught Pokemon Count */}
      {caughtPokemon.length > 0 && (
        <div className="alert alert-success mb-6">
          <Sparkles className="w-5 h-5" />
          <span>You've caught {caughtPokemon.length} Pokemon!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wild Pokemon Encounter */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Wild Pokemon Encounter</h2>
            
            {!currentPokemon && !isSearching && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <Search className="w-16 h-16 mx-auto opacity-50" />
                </div>
                <p className="mb-4">Search for a wild Pokemon to encounter!</p>
                <button 
                  className="btn btn-primary gap-2"
                  onClick={handleFindPokemon}
                >
                  <Search className="w-4 h-4" />
                  Find Pokemon
                </button>
              </div>
            )}

            {isSearching && (
              <div className="text-center py-8">
                <div className="loading loading-spinner loading-lg mb-4"></div>
                <p>Searching for wild Pokemon...</p>
              </div>
            )}

            {currentPokemon && (
              <div>
                <div className="text-center mb-4">
                  <div className="alert alert-info">
                    <span>A wild {currentPokemon.name} appeared!</span>
                  </div>
                </div>
                
                <WildPokemonDisplay pokemon={currentPokemon} />
                
                <div className="card-actions justify-center mt-6 gap-3">
                  <button 
                    className="btn btn-success gap-2"
                    onClick={handleCatchPokemon}
                  >
                    <Sparkles className="w-4 h-4" />
                    Catch Pokemon
                  </button>
                  <button 
                    className="btn btn-outline gap-2"
                    onClick={handleSkipPokemon}
                  >
                    <Search className="w-4 h-4" />
                    Find Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caught Pokemon Collection */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Your Collection</h2>
            
            {caughtPokemon.length === 0 ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <Heart className="w-16 h-16 mx-auto opacity-50" />
                </div>
                <p>No Pokemon caught yet. Start your collection!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {caughtPokemon.map((pokemonId, index) => (
                  <CaughtPokemonCard key={`${pokemonId}-${index}`} pokemonId={pokemonId} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WildPokemonDisplay({ pokemon }: { pokemon: any }) {
  return (
    <div className="card bg-base-100">
      <div className="card-body">
        <h3 className="text-lg font-bold text-center">{pokemon.name}</h3>
        
        {/* Pokemon Image */}
        <PokemonImage 
          imageUrl={pokemon.imageUrl} 
          name={pokemon.name} 
        />
        
        <div className="flex gap-1 justify-center mb-3">
          {pokemon.types.map((type: string) => (
            <span key={type} className="badge badge-primary badge-sm">
              {type}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span className={getStatColor(pokemon.hp, 'hp')}>
              HP: {getStatAdjective(pokemon.hp, 'hp')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Sword className="w-3 h-3" />
            <span className={getStatColor(pokemon.attack, 'attack')}>
              ATK: {getStatAdjective(pokemon.attack, 'attack')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span className={getStatColor(pokemon.defense, 'defense')}>
              DEF: {getStatAdjective(pokemon.defense, 'defense')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span className={getStatColor(pokemon.speed, 'speed')}>
              SPD: {getStatAdjective(pokemon.speed, 'speed')}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs opacity-70 mb-1">Moves:</div>
          <div className="space-y-1">
            {pokemon.moves.slice(0, 2).map((move: any, index: number) => (
              <div key={index} className="text-xs bg-base-200 p-1 rounded">
                <span className="font-semibold">{move.name}</span>
                <span className="opacity-70"> ({move.type}, {move.power === 0 ? "STATUS" : `${move.power} PWR`})</span>
              </div>
            ))}
            {pokemon.moves.length > 2 && (
              <div className="text-xs opacity-70">+{pokemon.moves.length - 2} more moves</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CaughtPokemonCard({ pokemonId }: { pokemonId: Id<"pokemon"> }) {
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
    <div className="card bg-base-100">
      <div className="card-body p-3">
        <div className="flex items-center gap-3">
          <PokemonImageSmall imageUrl={pokemon.imageUrl} name={pokemon.name} />
          <div className="flex-1">
            <div className="font-bold text-sm">{pokemon.name}</div>
            <div className="flex gap-1 mb-1">
              {pokemon.types.map((type: string) => (
                <span key={type} className="badge badge-primary badge-xs">
                  {type}
                </span>
              ))}
            </div>
            <div className="text-xs opacity-70">
              HP: {pokemon.hp} • ATK: {pokemon.attack} • DEF: {pokemon.defense}
            </div>
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
        <div className="w-32 h-32 rounded-lg border-2 border-base-300 bg-base-200 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-3">
      <div className="relative w-32 h-32">
        {isLoading && (
          <div className="absolute inset-0 rounded-lg border-2 border-base-300 bg-base-200 flex items-center justify-center">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={name}
          className={`w-32 h-32 rounded-lg object-cover border-2 border-base-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
        />
        {hasError && !isLoading && (
          <div className="absolute inset-0 rounded-lg border-2 border-base-300 bg-base-200 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 opacity-50" />
          </div>
        )}
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
      <div className="w-12 h-12 rounded border border-base-300 bg-base-200 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-4 h-4 opacity-50" />
      </div>
    );
  }

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      {isLoading && (
        <div className="absolute inset-0 rounded border border-base-300 bg-base-200 flex items-center justify-center">
          <div className="loading loading-spinner loading-xs"></div>
        </div>
      )}
      <img 
        src={imageUrl} 
        alt={name}
        className={`w-12 h-12 rounded object-cover border border-base-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
      {hasError && !isLoading && (
        <div className="absolute inset-0 rounded border border-base-300 bg-base-200 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 opacity-50" />
        </div>
      )}
    </div>
  );
}