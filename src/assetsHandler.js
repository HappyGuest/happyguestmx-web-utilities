'use strict';

const AWS = require('aws-sdk'),
    common = require(__dirname + '/common'),
    uuid = require('uuid'),
    Joi = require('joi'),
    env = process.env;

AWS.config.update({
    region: env.REGION
});

const s3 = new AWS.S3();

const imageFormats = {
    "thumbnail": "75x75",
    "thumbnail_retina": "150x150",
    "thumbnail_3x": "300x300",
    "landscape": "350x150",
    "full_image": "480x320",
    "full_image_retina": "1024x768"
};

async function getImage(url, format) {
    try {
        await validateGetImage(url, format);
        let newPath = url.split("?")[0]; //if had timestamp.
        let arrayOfPath = newPath.split('/');
        newPath = arrayOfPath.splice(arrayOfPath.length - 1, 0, imageFormats[format]);
        newPath = arrayOfPath.join('/');
        newPath += `?${Date.now()}`;
        return newPath;
    } catch (err) {
        throw (err);
    }
}

async function storeImage(req) {
    try {
        await validateParamsToSave(req);
        const format = req.format || 'jpeg';
        const key = req.key || 'image';
        const blob = await base64ToBlob(req.image);
        const params = {
            Body: blob,
            Bucket: req.path.bucket,
            Key: `${key}.${format}`,
            ContentEncoding: 'base64',
            ContentType: `image/${format}`,
            ACL: 'public-read'
        };
        return await s3.putObject(params).promise();
    } catch (err) {
        throw (err);
    }
}

async function storeGallery(req) {
    try {
        let key,
            urls = [],
            promises = [];
        await validateParamsToSaveGallery(req);
        const format = req.format || 'jpeg';
        if (req.photo_gallery.length > 0) {
            for (const item of req.photo_gallery) {
                key = uuid.v4();
                promises.push(this.storeImage({
                    key,
                    image: item,
                    path: req.path
                }));
                urls.push(`${req.path.public}/${key}.${format}`);
            }
            await Promise.all(promises);
            return urls;
        } else resolve(urls);
    } catch (err) {
        throw (err);
    }
}

async function base64ToBlob(base64String) {
    try {
        let blob = "";
        if (base64String)
            blob = new Buffer(base64String.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        return blob;
    } catch (err) {
        throw (err);
    }
}

async function validateParamsToSave(req) {
    try {
        const schema = Joi.object().keys({
            image: Joi.string().regex(common.base64Regex).required(),
            format: Joi.valid("png", "jpeg", "jpg").required(),
            key: Joi.string().min(1).required(),
            path: Joi.object({
                public: Joi.string().regex(common.urlReGex).required(),
                bucket: Joi.string().regex(common.urlReGex).required()
            })
        });
        const result = Joi.validate(req, schema);
        if (result.err) throw (result.err);
        else return result;
    } catch (err) {
        throw (err);
    }
}

async function validateParamsToSaveGallery(req) {
    try {
        const image = Joi.string().regex(common.base64Regex).required();
        const schema = Joi.object().keys({
            photo_gallery: Joi.array().items(image),
            format: Joi.valid("png", "jpeg", "jpg").required(),
            path: Joi.object({
                public: Joi.string().regex(common.urlReGex).required(),
                bucket: Joi.string().regex(common.urlReGex).required()
            })
        });
        const result = Joi.validate(req, schema);
        if (result.err) throw (result.err);
        else return result;
    } catch (err) {
        throw (err);
    }
}

async function validateGetImage(url, format) {
    try {
        const schema = Joi.object().keys({
            url: Joi.string().regex(common.urlReGex).required(),
            format: Joi.valid(Object.keys(imageFormats)).required(),
        });
        const result = Joi.validate({
            url,
            format
        }, schema);
        if (result.err) throw (result.err);
        else return result;
    } catch (err) {
        throw (err);
    }
}

module.exports = {
    getImage,
    storeImage,
    storeGallery
};