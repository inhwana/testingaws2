const express = require('express')
//const ffmpeg = require('fluent-ffmpeg')
const S3 = require("@aws-sdk/client-s3");
//const S3Presigner = require("@aws-sdk/s3-request-presigner");
//const { Upload } = require("@aws-sdk/lib-storage")
//const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

//Default
const app = express ();
app.use(express.static('client'));
app.use(express.json()) // For parsing json

//AWS
const bucketName = 'n1234567-test'
s3Client = new S3.S3Client({ region: 'ap-southeast-2'})

app.post('/upload', async (res,req)=>{
    // Return Upload Presigned URL
    const {filename} = req.body
    try {
        const command = new S3.GetObjectCommand({
                Bucket: bucketName,
                Key: filename,
            });
        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600} );
        console.log(presignedURL);
        res.json(presignedURL)
    } catch (err) {
        console.log(err);
    }
})

const PORT = 3000
app.listen(PORT, ()=>{
    console.log("Server listening on PORT:", PORT)
})