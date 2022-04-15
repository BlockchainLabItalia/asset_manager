import { readFile, writeFile } from 'fs';

const CHUNK_SIZE = 10000;

const CHUNK_LENGTH_BYTES = 4 // max 4.294.967.295 bytes -> circa 4 Gigabyte ;
const CHUNK_POSITION_BYTES = 2; // max 65.535 chunks per file. byte 0x00 riservato
const CHUNK_XOR_BYTES = 2; // 
const ZERO = 0x00;
const MAX = 0xff;

const numberToBuffer = (num: number, size: number): Buffer => {
    if(num >= Math.pow(2, size*8)) {
        throw new Error('value is too high to be represented with a buffer of the providen size');
    }
    const bytes = Buffer.alloc(size) ;
    for ( var index = 0; index < bytes.length; index ++ ) {
        var byte = num & 0xff;
        bytes[index] = byte;
        num = (num - byte) / 256 ;
    }
    return bytes;
};

const bytesToNumber = (bytes: Buffer): number => {
    var value = 0;
    for ( var i = bytes.length - 1; i >= 0; i--) {
        value = (value * 256) + bytes[i];
    }
    return value;
};

const increment = (buffer: Buffer) => {
    for (var i = buffer.length - 1; i >= 0; i--) {
        if (buffer[i]++ !== 255) break;
    }
}


const _splitIntoChunks = (data: Buffer, merkleHeight: number): Buffer[] => {
    const chunkNumber = Math.pow(2, merkleHeight-1);
    const chunkSize = Math.ceil(data.length/chunkNumber);
    let res: Buffer[] = [];
    let tempBuf: Buffer;
    let start = 0;
    let end = chunkSize;
    let position = numberToBuffer(0, CHUNK_POSITION_BYTES);;
    while(start < data.length) {
        tempBuf = data.subarray(start, end)
        res.push(Buffer.concat([
            position,
            numberToBuffer(tempBuf.length, CHUNK_LENGTH_BYTES),
            tempBuf,
            Buffer.alloc(chunkSize-tempBuf.length) // in caso un buffer sia più piccolo della dimensione prefissata, lo riempio di zeri
        ]));
        start += chunkSize;
        end += chunkSize;
        increment(position)
    }
    return res;
}

const _xor = (array: Buffer[]): Buffer => {
    const c = Buffer.alloc(array[0].length);
    array.forEach((ele) => {
        ele.forEach((byte, i) => {
            c[i] = byte ^ c[i];
        })
    })
    return c
}

const _restoreFileFromChunks = (disks: Buffer[][]) => {
    const restored: Buffer[] = [];
    let chunks: Buffer[] = [];
    for (let i =0; i<disks.length; i++) {
        chunks = chunks.concat(disks[i]);
    }
    chunks.sort(Buffer.compare);
    chunks.forEach((ele, i) => {
        //if(ele[CHUNK_XOR_BYTES] != ZERO) {
        if(bytesToNumber(ele.subarray(CHUNK_XOR_BYTES, CHUNK_XOR_BYTES+CHUNK_POSITION_BYTES)) != ZERO) {
            restored.push(ele.subarray(CHUNK_XOR_BYTES));
        } else {
            let to_be_xor: Buffer[] = [];
            to_be_xor.push(ele.subarray(CHUNK_XOR_BYTES+CHUNK_POSITION_BYTES));
            for (let index = 1; index<disks.length; index++) {
                //if(chunks[i+index][CHUNK_XOR_BYTES] == ZERO){
                // if(bytesToNumber(chunks[i+index].subarray(CHUNK_XOR_BYTES, CHUNK_XOR_BYTES+CHUNK_POSITION_BYTES)) == ZERO){
                //     to_be_xor.push(chunks[i+index].subarray(CHUNK_XOR_BYTES+CHUNK_POSITION_BYTES));
                // } else {
                //     to_be_xor.push(chunks[i+index].subarray(CHUNK_XOR_BYTES));
                // }
                to_be_xor.push(chunks[i+index].subarray(CHUNK_XOR_BYTES));
            }
            restored.push(_xor(to_be_xor));
        }
    })
    restored.sort(Buffer.compare);
    let buf: Buffer = Buffer.alloc(0);
    let size: number;
    for(let i=0; i<restored.length; i++) {
        size = bytesToNumber(restored[i].subarray(CHUNK_POSITION_BYTES, CHUNK_POSITION_BYTES+CHUNK_LENGTH_BYTES));
        buf = Buffer.concat([
            buf,
            restored[i].subarray(CHUNK_POSITION_BYTES + CHUNK_LENGTH_BYTES, CHUNK_POSITION_BYTES + CHUNK_LENGTH_BYTES + size)
        ]);
    }
    return buf;
}

const _getRAID5Arrays = (chunks: Buffer[], num: number) => {
    const disk: Buffer[][] = [];
    for(let i=0; i<num+1; i++){
        disk[i] = <Buffer[]> [];
    }
    for(let i=0; i<chunks.length; i+=num) {
        let to_be_xor: Buffer[] = []
        for(let k=0; k<num; k++) {
            if(i+k < chunks.length) {
                disk[k].push(Buffer.concat([
                    numberToBuffer(i, CHUNK_XOR_BYTES),
                    chunks[i+k]
                ]));
                to_be_xor.push(chunks[i+k])
            } else {
                disk[k].push(Buffer.concat([
                    numberToBuffer(i, CHUNK_XOR_BYTES),
                    numberToBuffer(MAX, CHUNK_POSITION_BYTES),
                    Buffer.alloc(chunks[i].length-CHUNK_POSITION_BYTES)
                ]));
            }
        }
        disk[num].push(Buffer.concat([
            numberToBuffer(i, CHUNK_XOR_BYTES),
            numberToBuffer(ZERO, CHUNK_POSITION_BYTES),
            _xor(to_be_xor)
        ]));
    };
    return disk;
}

readFile('linuxmint.iso', (err, data) => {
    if (err) throw err;
    //console.log(data);
    //const res: Buffer[] = splitIntoChunks(data, CHUNK_SIZE)
    const t0 = Date.now();
    const res: Buffer[] = _splitIntoChunks(data, 12);
    const raid = _getRAID5Arrays(res,8);
    const t1 = Date.now();
    console.log("CHUNKS DATA SIZE: \t" + raid[0][0].length + " bytes");
    console.log("CHUNKS per DISK: \t" + raid[0].length + " chunks");
    console.log("DISK DATA SIZE: \t" + raid[0][0].length*raid[0].length + " bytes");
    //const restored = restoreFileFromChunks(raid[0], raid[1]);
    const restored = _restoreFileFromChunks([raid[0], raid[1], raid[3], raid[5], raid[8], raid[6], raid[4], raid[2]]);
    const t2 = Date.now();
    console.log("ORIGINAL DATA SIZE: \t" + data.length + " bytes");
    console.log("SPLIT TIME: \t\t" + (t1-t0) + " millis")
    console.log("RESTORE TIME: \t\t" + (t2-t1) + " millis")

    if (restored.equals(data)){
        console.log("### OK! ###")
    } else {
        console.log("RESTORED DATA SIZE: \t" + restored.length + " bytes");
    }
    // writeFile('asset2.png',restored, () => {
    // })
})
