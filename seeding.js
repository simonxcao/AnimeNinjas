

const { default: axios } = require("axios")
const express = require('express')
const app = express()
const path = require('path')
const mongoose = require('mongoose')
const { get } = require("http")


// mongoose.connect('mongodb://localhost:27017/Anime')
//     .then(() => {
//         console.log('open')
//     })


app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// app.listen(3000, () => {
//     console.log('app is listening')
// })

const AnimeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    picture: {
        type: String,
        required: true
    },
    synopsis: {
        type: String,

    },
    rank: {
        type: String

    },
    genre: {
        type: Array,
    },
    link: {
        type: String
    },

    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
})

const Anime = mongoose.model('Anime', AnimeSchema)
var tot = 0

const getAnime = async (num) => {
    try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime?page=${num}`)
        const data = res.data.data

        for (let each of data) {
            tot += 1
            const url = each.url
            const pic = each.images.jpg.image_url
            const title = each.title

            const syn = each.synopsis


            const ranking = each.rank
            const genre = []
            for (let type of each.genres) {
                genre.push(type.name)
            }
            const p = new Anime({
                name: title,
                picture: pic,
                synopsis: syn,
                rank: ranking,
                genre: genre,
                link: url
            })

            p.save().then(p => {
                console.log(p.name)
                console.log(tot)
            })
                .catch(e => {
                    console.log(e)
                })


        }




    } catch (e) {
        console.log(e.code)
    }
}



//stores all the anime into my database


// const timer = ms => new Promise(res => setTimeout(res, ms))

// async function load() {
//     for (var i = 101; i <= 1010; i++) {
//         getAnime(i)
//         await timer(1200);
//     }
// }

// load();






module.exports = Anime


