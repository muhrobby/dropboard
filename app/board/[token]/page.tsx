import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicBoardClient } from "./public-board-client";
import type { PublicBoardResponse } from "@/types/api";

type Props = {
  params: Promise<{ token: string }>;
};

async function getBoard(token: string): Promise<PublicBoardResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3004";
    const res = await fetch(`${baseUrl}/api/v1/public/boards/${token}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data as PublicBoardResponse;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const board = await getBoard(token);
  if (!board) return { title: "Board not found" };
  return {
    title: board.collection.name,
    description: `A curated board with ${board.items.length} items`,
    openGraph: {
      title: board.collection.name,
      description: `A curated board with ${board.items.length} items — powered by Dropboard`,
    },
  };
}

export default async function PublicBoardPage({ params }: Props) {
  const { token } = await params;
  const board = await getBoard(token);
  if (!board) notFound();
  return <PublicBoardClient board={board} />;
}
