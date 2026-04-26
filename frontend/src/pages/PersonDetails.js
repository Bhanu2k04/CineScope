import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function PersonDetails() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:5000/people/${id}`)
      .then(r => r.json())
      .then(setPerson)
      .catch(() => setPerson(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
    </div>
  );
  if (!person) return (
    <div className="text-white text-center py-20 bg-gray-900 min-h-screen">Person not found</div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/people" className="inline-block mb-6 text-purple-400 hover:text-purple-300 transition-colors">
          ← Back to People
        </Link>

        <div className="flex flex-col md:flex-row gap-8 mb-10">
          <div className="w-full md:w-1/4">
            <img
              src={person.profile_path || "https://via.placeholder.com/300x450"}
              alt={person.name}
              className="w-full rounded-xl shadow-2xl"
              onError={(e) => { e.target.src = "https://via.placeholder.com/300x450"; }}
            />
          </div>

          <div className="w-full md:w-3/4">
            <h1 className="text-4xl font-bold mb-4">{person.name}</h1>
            {person.biography && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 text-purple-400">Biography</h3>
                <p className="text-gray-300 whitespace-pre-line leading-relaxed">{person.biography}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {person.birthday && (
                <p><span className="text-gray-400">Born:</span> {new Date(person.birthday).toLocaleDateString()}</p>
              )}
              {person.place_of_birth && (
                <p><span className="text-gray-400">From:</span> {person.place_of_birth}</p>
              )}
              {person.known_for && (
                <p><span className="text-gray-400">Known For:</span> <span className="capitalize">{person.known_for}</span></p>
              )}
            </div>
          </div>
        </div>

        {person.movies?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Filmography ({person.movies.length} films)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {person.movies.map(movie => (
                <div key={`${movie.id}-${movie.role}`} className="group">
                  <Link to={`/movie/${movie.id}`} className="block">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-gray-800">
                      <img
                        src={movie.poster_path || "https://via.placeholder.com/300x450"}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        onError={(e) => { e.target.src = "https://via.placeholder.com/300x450"; }}
                      />
                    </div>
                    <h3 className="text-white text-xs font-medium mt-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                      {movie.title}
                    </h3>
                    {movie.role && <p className="text-gray-400 text-xs">as {movie.role}</p>}
                    {movie.job && <p className="text-purple-400 text-xs">{movie.job}</p>}
                    {movie.release_year && <p className="text-gray-500 text-xs">{movie.release_year}</p>}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
