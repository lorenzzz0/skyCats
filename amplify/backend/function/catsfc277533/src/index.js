/* Amplify Params - DO NOT EDIT
	STORAGE_S3158226AE_BUCKETNAME
Amplify Params - DO NOT EDIT */

const https = require('https')
const AWS = require('aws-sdk');
const axios = require('axios');

async function getCatCountry(options) {
    return await new Promise((resolve, reject) => {
        https.get(options, function(res) {
            res.on('data', dataString => {
                let data = JSON.parse(dataString)
                try {
                    let country = data[0].origin
                    resolve(country);
                } catch (e) {
                    resolve(false)
                }
            });
        })
    })
}


async function saveS3(url, fileName, bucketName) {
    let buffer = await axios
        .get(url, {
            responseType: 'arraybuffer'
        })
        .then(response => Buffer.from(response.data, 'binary'))
    
    const s3 = new AWS.S3();
    try {
        const destparams = {
            Bucket: bucketName,
            Key: fileName + '.jpeg',
            Body: buffer,
            ContentType: "image",
            ACL: 'public-read'
        };
        const putResult = await s3.putObject(destparams).promise();
    } catch (error) {

    }


}

exports.handler = async (event) => {
    let data = JSON.parse(event.body);
    let breed = data.breed;
    let apiCatKey = process.env.API_CAT;
    let apiMapKey = process.env.API_MAP;
    let bucketName = process.env.STORAGE_S3158226AE_BUCKETNAME;

    const options = {
        hostname: 'api.thecatapi.com',
        path: '/v1/breeds/search?q=' + encodeURI(breed),
        headers: {
            'x-api-key': apiCatKey,
            'Content-Type': 'application/json'
        }
    }

    let country = await getCatCountry(options)
    if (!country) {
        let response =  {
            "mapImg": "",
            "message": "not found"
        }
        return{
            "statusCode": 200,
            "body":  JSON.stringify(response),
            'headers': { 'Content-Type': 'application/json' }
        }
    }

    let fileName = breed + '-' + country;

    try {
        let params = {
            Bucket: bucketName,
            Key: fileName + '.jpeg',
        }

        const s3 = new AWS.S3();
        const headCode = await s3.headObject(params).promise();
        const signedUrl = s3.getSignedUrl('getObject', params);

    } catch (headErr) {
        if (headErr.code === 'NotFound') {
            let url = 'https://maps.googleapis.com/maps/api/staticmap?center=' + country + '&zoom=5&size=600x300&maptype=terrain&markers=color:red%7C' + country + '&key=' + apiMapKey
            let ep = await saveS3(url, fileName, bucketName)
        }
    }
    let response = {
        "mapImg": "https://"+bucketName+".s3.amazonaws.com/" + encodeURI(fileName) + ".jpeg",
        "message": "success"
    }
    return{
        "statusCode": 200,
        "body": JSON.stringify(response),
        'headers': { 'Content-Type': 'application/json' }
    }
};
