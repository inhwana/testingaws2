const express = require('express')
const ffmpeg = require('fluent-ffmpeg')
const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const { Upload } = require("@aws-sdk/lib-storage")
const { PassThrough } = require('stream');
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

//Default
const app = express ();
app.use(express.static('client'));
app.use(express.json()) // For parsing json

//AWS
const bucketName = 'n10851879-test'
s3Client = new S3.S3Client({ region: 'ap-southeast-2'})

app.post('/upload', async (req,res)=>{
    // Return Upload Presigned URL
    const {filename} = req.body
    //const {filename, contentType} = req.body
    try {
        const command = new S3.PutObjectCommand({
                Bucket: bucketName,
                Key: filename,
                //ContentType: contentType
            });
        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600} );
        console.log(presignedURL);
        //console.log("Received:", filename, contentType);
        res.json({url :presignedURL})
    } catch (err) {
        console.log(err);
    }
})


// Transcode the video from S3
app.post('/transcode', async (req,res) =>{
    const {filename} = req.body
    let transcodedkey = `transcoded${filename}`

    let response
    // Create and send a command to read an object
    try {
        response = await s3Client.send(
            new S3.GetObjectCommand({
                Bucket: bucketName,
                Key: filename,
            })
        );
     
    const video = response.Body
    const videostream = new PassThrough()

    const uploads3 = new Upload({
        client: s3Client,
        params: {
            Bucket: bucketName,
            Key:transcodedkey,
            Body: videostream,
            ContentType: 'video/mp4'
            //ContentType: 'video/avi'
        }
    })
    
    ffmpeg(video)
    .outputOptions('-movflags frag_keyframe+empty_moov')
    .videoCodec('libx264')
    .format('mp4')
    // Testing with WebM
    // .outputFormat('webm')
    // .videoCodec('libvpx') // libvpx-vp9 For higher CPU Usage
    // .audioCodec('libvorbis') // libopus  
    //.output('pipe:1')
    .on('start', cmd => console.log('FFmpeg started:', cmd))
    .on('error', (err) => {
    console.error('Error:', err.message);
    res.status(500).send("Transcoding Failed :(")
    return;
    })
    .on('end', () => console.log('FFmpeg finished'))
    .pipe(videostream, {end:true})



    // ffmpeg(video)
    // .videoCodec('libvpx')
    // .audioCodec('libvorbis')
    // .format('webm')
    // .on('start', cmd => console.log('FFmpeg started:', cmd))
    // .on('error', err => {
    //     console.error('FFmpeg error:', err.message);
    //     if (!res.headersSent) res.status(500).send('Transcoding Failed');
    // })
    // .on('end', () => console.log('FFmpeg finished'))
    // .pipe(videostream, { end: true });


    const result = await uploads3.done()
    console.log(result);


    const command = new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: transcodedkey,
        ResponseContentDisposition: 'attachment; filename=transcodedkey',
    });  

    const downloadpresignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600});
    res.json({url: downloadpresignedURL})
        
    // Delete Original Video    
    const data = await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: filename
    }));
    console.log("Success. Object deleted.", data);
    // Delete Original Video 
    }catch (err) {
        console.log(err);
    }  
})
    

const PORT = 3000
app.listen(PORT, ()=>{
    console.log("Server listening on PORT:", PORT)
})