import { traceStore } from "@/store/trace-store";
import { atom } from "jotai";
import { notice } from "../7-toaster";

export type DoSetFilesFrom_Dnd_Atom = typeof doSetFilesFrom_Dnd_Atom;

export const doSetFilesFrom_Dnd_Atom = atom(                    // used by DropItDoc only
    null,
    async (get, set, dataTransfer: DataTransfer) => {
        const files: File[] = [];

        if (dataTransfer.items) {
            for (let i = 0; i < dataTransfer.items.length; i++) {
                const item = dataTransfer.items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
        } else {
            for (let i = 0; i < dataTransfer.files.length; i++) {
                const file = dataTransfer.files[i];
                files.push(file);
            }
        }

        if (files.length !== 1) {
            notice.warning("Only first file will be loaded for now.");
        }

        const file = files[0];
        if (file) {
            traceStore.loadTrace(file);
        }
    }
); 
