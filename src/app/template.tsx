/**
 * Root template - remounts on every navigation, so the subtle fade replays on
 * each route change. Motion is disabled for users who prefer reduced motion
 * (see the media query in globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in duration-200">{children}</div>;
}
