"use strict";
exports.__esModule = true;
exports.getRAID5Arrays = exports.restoreFileFromChunks = exports.xor = exports._splitIntoChunks = exports.splitIntoChunks = exports.bytesToNumber = exports.numberToBuffer = void 0;
var CHUNK_SIZE = 10000;
var CHUNK_LENGTH_BYTES = 4; // max 4.294.967.295 bytes -> circa 4 Gigabyte ;
var CHUNK_POSITION_BYTES = 2; // max 65.535 chunks per file. byte 0x00 riservato
var CHUNK_XOR_BYTES = 2; // 
var ZERO = 0x00;
var MAX = 0xff;
var numberToBuffer = function (num, size) {
    if (num >= Math.pow(2, size * 8)) {
        throw new Error('value is too high to be represented with a buffer of the providen size');
    }
    var bytes = Buffer.alloc(size);
    for (var index = 0; index < bytes.length; index++) {
        var byte = num & 0xff;
        bytes[index] = byte;
        num = (num - byte) / 256;
    }
    return bytes;
};
exports.numberToBuffer = numberToBuffer;
var bytesToNumber = function (bytes) {
    var value = 0;
    for (var i = bytes.length - 1; i >= 0; i--) {
        value = (value * 256) + bytes[i];
    }
    return value;
};
exports.bytesToNumber = bytesToNumber;
var splitIntoChunks = function (data, merkleHeight) {
    var chunkNumber = Math.pow(2, merkleHeight - 1);
    var chunkSize = Math.ceil(data.length / chunkNumber);
    var res = [];
    var tempBuf;
    var start = 0;
    var end = chunkSize;
    var position = 1;
    while (start < data.length) {
        tempBuf = data.subarray(start, end);
        res.push(Buffer.concat([
            (0, exports.numberToBuffer)(position, CHUNK_POSITION_BYTES),
            (0, exports.numberToBuffer)(tempBuf.length, CHUNK_LENGTH_BYTES),
            tempBuf,
            Buffer.alloc(chunkSize - tempBuf.length) // in caso un buffer sia più piccolo della dimensione prefissata, lo riempio di zeri
        ]));
        start += chunkSize;
        end += chunkSize;
        position++;
    }
    return res;
};
exports.splitIntoChunks = splitIntoChunks;
var _splitIntoChunks = function (data, chunkSize) {
    var res = [];
    var tempBuf;
    var start = 0;
    var end = chunkSize;
    var position = 1;
    while (start < data.length) {
        tempBuf = data.subarray(start, end);
        res.push(Buffer.concat([
            (0, exports.numberToBuffer)(position, CHUNK_POSITION_BYTES),
            (0, exports.numberToBuffer)(tempBuf.length, CHUNK_LENGTH_BYTES),
            tempBuf,
            Buffer.alloc(chunkSize - tempBuf.length) // in caso un buffer sia più piccolo della dimensione prefissata, lo riempio di zeri
        ]));
        start += chunkSize;
        end += chunkSize;
        position++;
    }
    return res;
};
exports._splitIntoChunks = _splitIntoChunks;
var xor = function (array) {
    var c = Buffer.alloc(array[0].length);
    array.forEach(function (ele) {
        ele.forEach(function (byte, i) {
            c[i] = byte ^ c[i];
        });
    });
    return c;
};
exports.xor = xor;
var restoreFileFromChunks = function (disks) {
    var restored = [];
    var chunks = [];
    for (var i = 0; i < disks.length; i++) {
        chunks = chunks.concat(disks[i]);
    }
    chunks.sort(Buffer.compare);
    chunks.forEach(function (ele, i) {
        //if(ele[CHUNK_XOR_BYTES] != ZERO) {
        if ((0, exports.bytesToNumber)(ele.subarray(CHUNK_XOR_BYTES, CHUNK_XOR_BYTES + CHUNK_POSITION_BYTES)) != ZERO) {
            restored.push(ele.subarray(CHUNK_XOR_BYTES));
        }
        else {
            var to_be_xor = [];
            to_be_xor.push(ele.subarray(CHUNK_XOR_BYTES + CHUNK_POSITION_BYTES));
            for (var index = 1; index < disks.length; index++) {
                //if(chunks[i+index][CHUNK_XOR_BYTES] == ZERO){
                // if(bytesToNumber(chunks[i+index].subarray(CHUNK_XOR_BYTES, CHUNK_XOR_BYTES+CHUNK_POSITION_BYTES)) == ZERO){
                //     to_be_xor.push(chunks[i+index].subarray(CHUNK_XOR_BYTES+CHUNK_POSITION_BYTES));
                // } else {
                //     to_be_xor.push(chunks[i+index].subarray(CHUNK_XOR_BYTES));
                // }
                to_be_xor.push(chunks[i + index].subarray(CHUNK_XOR_BYTES));
            }
            restored.push((0, exports.xor)(to_be_xor));
        }
    });
    //restored.sort(Buffer.compare);
    restored.sort(function (a, b) { return (0, exports.bytesToNumber)(a.subarray(0, CHUNK_POSITION_BYTES)) - (0, exports.bytesToNumber)(b.subarray(0, CHUNK_POSITION_BYTES)); });
    var buf = Buffer.alloc(0);
    var size;
    for (var i = 0; i < restored.length; i++) {
        size = (0, exports.bytesToNumber)(restored[i].subarray(CHUNK_POSITION_BYTES, CHUNK_POSITION_BYTES + CHUNK_LENGTH_BYTES));
        buf = Buffer.concat([
            buf,
            restored[i].subarray(CHUNK_POSITION_BYTES + CHUNK_LENGTH_BYTES, CHUNK_POSITION_BYTES + CHUNK_LENGTH_BYTES + size)
        ]);
    }
    return buf;
};
exports.restoreFileFromChunks = restoreFileFromChunks;
var getRAID5Arrays = function (chunks, num) {
    var disk = [];
    for (var i = 0; i < num + 1; i++) {
        disk[i] = [];
    }
    for (var i = 0; i < chunks.length; i += num) {
        var to_be_xor = [];
        for (var k = 0; k < num; k++) {
            if (i + k < chunks.length) {
                disk[k].push(Buffer.concat([
                    (0, exports.numberToBuffer)(i, CHUNK_XOR_BYTES),
                    chunks[i + k]
                ]));
                to_be_xor.push(chunks[i + k]);
            }
            else {
                disk[k].push(Buffer.concat([
                    (0, exports.numberToBuffer)(i, CHUNK_XOR_BYTES),
                    (0, exports.numberToBuffer)(MAX, CHUNK_POSITION_BYTES),
                    Buffer.alloc(chunks[i].length - CHUNK_POSITION_BYTES)
                ]));
            }
        }
        disk[num].push(Buffer.concat([
            (0, exports.numberToBuffer)(i, CHUNK_XOR_BYTES),
            (0, exports.numberToBuffer)(ZERO, CHUNK_POSITION_BYTES),
            (0, exports.xor)(to_be_xor)
        ]));
    }
    ;
    return disk;
};
exports.getRAID5Arrays = getRAID5Arrays;
