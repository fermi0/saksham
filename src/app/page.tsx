import HomeScene from "@/components/scenes/HomeScene";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Our 3D Background */}
      <HomeScene />

      {/* Test Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-6xl font-bold">Saksham</h1>
        <p className="mt-4 text-xl text-gray-400">
          Personal website — blogs, projects, and notes.
        </p>
      </div>
    </main>
  );
}