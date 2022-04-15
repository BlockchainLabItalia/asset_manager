"use strict";
exports.__esModule = true;
var fs_1 = require("fs");
var utils_1 = require("./utils");
var CHUNK_SIZE = 100000;
(0, fs_1.readFile)('webstorm.exe', function (err, data) {
    if (err)
        throw err;
    var t0 = Date.now();
    //const res: Buffer[] = splitIntoChunks(data, 12);
    var res = (0, utils_1._splitIntoChunks)(data, CHUNK_SIZE);
    var raid = (0, utils_1.getRAID5Arrays)(res, 8);
    var t1 = Date.now();
    console.log("ORIGINAL DATA SIZE: \t" + data.length + " bytes");
    console.log("NUMBER OF CHUNKS : \t" + res.length + " chunks");
    console.log("CHUNKS DATA SIZE: \t" + raid[0][0].length + " bytes");
    console.log("CHUNKS per DISK: \t" + raid[0].length + " chunks");
    console.log("DISK DATA SIZE: \t" + raid[0][0].length * raid[0].length + " bytes");
    var restored = (0, utils_1.restoreFileFromChunks)([raid[0], raid[1], raid[3], raid[5], raid[8], raid[6], raid[4], raid[2]]);
    var t2 = Date.now();
    console.log("SPLIT TIME: \t\t" + (t1 - t0) + " millis");
    console.log("RESTORE TIME: \t\t" + (t2 - t1) + " millis");
    if (restored.equals(data)) {
        console.log("### OK! ###");
    }
    else {
        console.log("RESTORED DATA SIZE: \t" + restored.length + " bytes");
    }
    // writeFile('asset2.png',restored, () => {
    // })
});
