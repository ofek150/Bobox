import * as SparkMD5 from 'spark-md5';
export const calculateETag = async (fileBlob: Blob, partSize: number, numParts: number): Promise<string> => {
    const chunkSize = partSize;
    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileArrayBuffer);

    const spark = new SparkMD5.ArrayBuffer();

    // Calculate MD5 checksums for each part
    for (let i = 0; i < numParts; i++) {
        const startOffset = i * chunkSize;
        const endOffset = Math.min((i + 1) * chunkSize, fileUint8Array.length);
        spark.append(fileUint8Array.subarray(startOffset, endOffset));
    }

    const md5Checksum = spark.end();

    // Create the ETag by appending the number of parts
    const eTag = `"${md5Checksum}-${numParts}"`;

    return eTag;
};