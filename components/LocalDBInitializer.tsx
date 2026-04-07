"use client";

import { useEffect } from "react";
import { db } from "@/lib/local-db/db";

export function LocalDBInitializer() {
  useEffect(() => {
    const initDB = async () => {
      try {
        // Just calling open() ensures the database is initialized
        await db.open();
        console.log("IndexedDB initialized");
      } catch (err) {
        console.error("Failed to initialize IndexedDB:", err);
      }
    };

    initDB();
  }, []);

  return null;
}
