const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')
const Schema = mongoose.Schema


const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    favs: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Anime'

        }
    ]
})


UserSchema.plugin(passportLocalMongoose)


module.exports = mongoose.model('User', UserSchema)