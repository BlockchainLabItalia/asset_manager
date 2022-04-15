## splitIntoChunks( data, size )
    - data: buffer di dati del file in ingresso;
    - size: dimensione dei chunk.

questa funzione divide un unico buffer di dati in molte piccole parti di uguali dimensione (_size_) .

il chunk ottenuto è così composto:

 valore: | ordinamento  | lunghezza (<= _size_ ) | dati | padding
 --------| ------------ |------------------------|------|--------
 numero di bytes: | CHUNK_POSITION_BYTES | CHUNK_LENGTH_BYTES | lunghezza | size - lunghezza

 il valore _ordinamento_ serve a ricostruire correttamente il file;
 
 il valore _lunghezza_ serve ad indicare quanti sono i bytes 'utili' di questo chunk;

 il valore _dati_ contiene le porzioni n-sima porzione del file;

 il valore di padding è 0x00 e serve a portare un chunk a lunghezza _size_ qualora le dimensioni della porzione _dati_ dovessero essere inferiori.

 questa funzione restituisce un array di chunks.

---

 ## getRAID5Arrays( chunks , num)
    - chunks: array di chunks ottenuti dalla funzione splitIntoChunks;
    - num: numero di array in cui si vuole suddividere i chunks.

Questa funzione divide la lista di chunks in _num_ arrays contenenti tutti lo stesso numero di elementi. nel caso in cui alcuni array dovessero avere dimensioni inferiori ad altri, in questi verranno inseriti dei buffer di dimensini pari alla dimensione di un chunk contenenti però solo 0x00.

Dopo la divisione, verrà creato un nuovo array il cui contenuto sarà calcolato effettuando l'operazione di xor tra gli elementi degli altri array, come indicato nella seguente tabella:

ARRAY 1 | ARRAY 2 | ... | ARRAY num | ARRAY num+1
--------|---------|-----|-----------|------------
chunks[0]| chunks[1]| ... | chunks[num-1] | chunks[0] XOR chunks[1] XOR ... XOR chunks[num-1]
chunks[num]| chunks[num+1]| ... | chunks[2num-1] | chunks[num] XOR chunks[num+1] XOR ... XOR chunks[2num-1]
... | ... | ... | ... | ... |

ai chunks verranno aggiunti dei bytes per indicare il gruppo di chunks usati per calcolare i chunks dell'ultimo array.
in più, agli elementi dell' ultimo array, verrà aggiunto un byte _isXOR_ dal valore 0x00, per indicare che questo chunk è il risultato di un'operazione di xor, e sarà utile durante il restore.
 valore: | gruppo | isXOR | ordinamento  | lunghezza (<= _size_ ) | dati | padding
 --------| -------| ------|------------ |------------------------|------|--------
 numero di bytes: | CHUNK_XOR_BYTES | 1 | CHUNK_POSITION_BYTES | CHUNK_LENGTH_BYTES | lunghezza | size - lunghezza

questa funzione restituirà quindi un numero di array pari a num+1, e gli elementi di questi array saranno array contenenti i vari chunks.

---

## restoreFileFromChunks( raidArray )
    - raidArray: un array contenente un numero di elementi pari al precedente num. gli elementi di questo array saranno array contententi i vari chunks.

questa funzione ricostruisce il file originale a partire dai chunks in cui è stato diviso.

innanzitutto tutti i chunks vengono inseriti in un unico array, e successivamente questo viene ordinato.
in questo modo tutti i chunk dello stesso _gruppo_ si trovano vicini. a questo punto si controlla che tra di questi non ci siano chunk contenenti il byte _isXOR_. in caso contrario questo viene usato, insieme agli altri chunk dello stesso gruppo, per ricostruire il chunk mancante.

Fatta questa operazione si rimuove dai chunk la porzione **gruppo**, e questi vengono nuovamente ordinati.
Dopo essere stati ordinati, da questi viene estratta la porzione **dati**, utilizzando le informazioni della porzione **lunghezza**, e viene ricostruito il buffer originale.