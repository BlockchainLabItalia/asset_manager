import { readFile } from 'fs';
import { getRAID5Arrays, restoreFileFromChunks, splitIntoChunks, _splitIntoChunks } from './utils';
const CHUNK_SIZE = 100000;

readFile('webstorm.exe', (err, data) => {
    if (err) throw err;

    const t0 = Date.now();
    //const res: Buffer[] = splitIntoChunks(data, 12);
    const res: Buffer[] = _splitIntoChunks(data, CHUNK_SIZE);
    const raid = getRAID5Arrays(res,8);
    const t1 = Date.now();
    console.log("ORIGINAL DATA SIZE: \t" + data.length + " bytes");
    console.log("NUMBER OF CHUNKS : \t" + res.length + " chunks");
    console.log("CHUNKS DATA SIZE: \t" + raid[0][0].length + " bytes");
    console.log("CHUNKS per DISK: \t" + raid[0].length + " chunks");
    console.log("DISK DATA SIZE: \t" + raid[0][0].length*raid[0].length + " bytes");
    
    const restored = restoreFileFromChunks([raid[0], raid[1], raid[3], raid[5], raid[8], raid[6], raid[4], raid[2]]);
    const t2 = Date.now();
    console.log("SPLIT TIME: \t\t" + (t1-t0) + " millis")
    console.log("RESTORE TIME: \t\t" + (t2-t1) + " millis")

    if (restored.equals(data)){
        console.log("### OK! ###")
    } else {
        console.log("#KO RESTORED DATA SIZE: \t" + restored.length + " bytes");
    }
    // writeFile('asset2.png',restored, () => {
    // })
})