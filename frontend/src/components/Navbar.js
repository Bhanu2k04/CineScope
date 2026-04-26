import { FiInfo } from "react-icons/fi";

export default function Navbar({ setInfoOpen, user }) {
  return (
    <div className="py-4 px-6 bg-gray-800 flex justify-between items-center w-full sticky top-0 z-20 shadow-md">
      <div className="text-sm text-gray-400">
        {user?.name && (
          <span>
            <span className="text-gray-500">Watching as </span>
            <span className="text-purple-400 font-semibold">
              {user.profile_emoji || "👤"} {user.name}
            </span>
          </span>
        )}
      </div>
      <button
        onClick={() => setInfoOpen(true)}
        className="text-white hover:text-purple-400 transition-colors"
        title="About CineScope"
      >
        <FiInfo size={24} />
      </button>
    </div>
  );
}
