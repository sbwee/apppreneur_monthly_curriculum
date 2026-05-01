type HelloResponse = {
  message: string;
};

async function getHelloMessage() {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

  try {
    const response = await fetch(`${backendUrl}/api/hello`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return `Backend returned ${response.status}`;
    }

    const data = (await response.json()) as HelloResponse;
    return data.message;
  } catch {
    return "Could not reach backend. Is the backend server running?";
  }
}

export default async function Home() {
  const message = await getHelloMessage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Monthly Curriculum - Phase 0
        </h1>
        <p className="mt-4 text-zinc-700 dark:text-zinc-300">
          Message from backend:
        </p>
        <p className="mt-2 rounded-lg bg-zinc-100 p-4 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
          {message}
        </p>
      </main>
    </div>
  );
}
