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
export interface ChatMessage {
    id: bigint;
    text: string;
    sender: string;
    timestamp: bigint;
}
export interface backendInterface {
    getLeaderboard(gameId: string): Promise<Array<ScoreEntry>>;
    getMessages(): Promise<Array<ChatMessage>>;
    getPersonalBest(gameId: string, player: string): Promise<bigint | null>;
    getRoomMessages(code: string): Promise<Array<ChatMessage>>;
    sendMessage(sender: string, text: string): Promise<bigint>;
    sendRoomMessage(code: string, sender: string, text: string): Promise<bigint>;
    submitScore(gameId: string, player: string, score: bigint): Promise<void>;
}
