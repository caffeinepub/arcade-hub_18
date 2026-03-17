import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ScoreEntry {
    player: string;
    score: bigint;
}
export interface backendInterface {
    getLeaderboard(gameId: string): Promise<Array<ScoreEntry>>;
    getPersonalBest(gameId: string, player: string): Promise<bigint | null>;
    submitScore(gameId: string, player: string, score: bigint): Promise<void>;
}
