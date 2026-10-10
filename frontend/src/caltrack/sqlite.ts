import { openDatabaseAsync } from "expo-sqlite";
import { createDatabaseService } from "./database";
import { createSQLiteRepository } from "./repository";

export const calTrackRepository = createSQLiteRepository(
  createDatabaseService(() => openDatabaseAsync("caltrack.db")),
);
