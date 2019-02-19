//ver 0.2
const AWS = require('aws-sdk'),
    uuidv4 = require('uuid/v4'),
    env = process.env;

AWS.config.update({
    region: env.REGION
});

var s3 = new AWS.S3();

var assetsHandler = module.exports = {};

var imageFormats = {
    "thumbnail": "75x75",
    "thumbnail_retina": "150x150",
    "thumbnail_3x": "300x300",
    "landscape": "350x150",
    "full_image": "480x320",
    "full_image_retina": "1024x768"
};

assetsHandler.getImage = function (url, format) {
    if (url && format) {
        let newPath = url.split("?")[0]; //if had timestamp.
        let arrayOfPath = newPath.split('/');
        newPath = arrayOfPath.splice(arrayOfPath.length - 1, 0, imageFormats[format]);
        newPath = arrayOfPath.join('/');
        newPath += `?${Date.now()}`;
        return newPath;
    } else return url;
}

assetsHandler.storeImage = function (request_params) {
    return new Promise((resolve, reject) => {
        // console.log('request_params: ', request_params, '\n');
        let format = request_params.format || 'jpeg';
        let key = request_params.key || 'image';
        let blob = base64ToBlob(request_params.image);
        let params = {
            Body: blob,
            Bucket: request_params.path.bucket,
            Key: `${key}.${format}`,
            ContentEncoding: 'base64',
            ContentType: `image/${format}`,
            ACL: 'public-read'
        };
        // console.log('PARAMS: ', params, '\n');
        s3.putObject(params)
            .promise()
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                console.log('err: ', err);
                reject(err);
            });
    });
}

//gallery, format, path
assetsHandler.storeGallery = async function (request_params) {
    return new Promise((resolve, reject) => {
        let urls = [];
        let key;
        let current;
        let format = request_params.format || 'jpeg';
        let promises = [];
        if (request_params.photo_gallery.length > 0) {
            request_params.photo_gallery.forEach((item) => {
                key = uuidv4();
                current = {
                    key: key,
                    image: item,
                    path: request_params.path
                }
                promises.push(this.storeImage(current));
                urls.push(`${request_params.path.public}/${key}.${format}`);
            });
            let response = Promise.all(promises);
            response.then((data) => {
                resolve(urls);
            }).catch((err) => {
                reject(err);
            });
        } else resolve(urls);
    });
}


function base64ToBlob(base64String) {
    let blob = "";
    if (base64String !== null && base64String !== undefined && base64String !== "")
        blob = new Buffer(base64String.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    return blob;
}