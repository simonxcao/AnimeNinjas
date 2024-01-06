

const express = require('express')
require('dotenv').config()

const path = require('path')
const mongoose = require('mongoose')
const EachAnime = require('./seeding')
const { json } = require('express')
const { default: axios } = require("axios")
const { get } = require("http")
const passport = require('passport')
const LocalStrategy = require('passport-local')

const catchAsync = require('./catchAsync')
const ExpressError = require('./ExpressError')

const Review = require('./review')

const { reviewSchema } = require('./schemas')
const methodOverride = require('method-override')
const session = require('express-session')
const flash = require('connect-flash')

const User = require('./user')


const { body, validationResult } = require('express-validator')
const { populate } = require('./seeding')
const MongoStore = require('connect-mongo');
const dbURL = process.env.DB_URL
const secret = process.env.SECRET || 'needbettersecret'




let animeName = ""
let animeGenre = ""

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
// 'mongodb://localhost:27017/Anime'
mongoose.connect(dbURL)

app.use(express.static('public'))

const store = MongoStore.create({
    mongoUrl: dbURL,
    crypto: {
        secret
    },
    touchAfter: 24 * 60 * 60
})
store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }



}

app.use(session(sessionConfig))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req, res, next) => {

    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    res.locals.currentUser = req.user
    next()
})


function TitleCase(str) {
    const titleCase = str
        .toLowerCase()
        .split(' ')
        .map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');

    return titleCase;
}


const db = mongoose.connection
db.on('error', console.error.bind(console, "connection error"))
db.once('open', () => {
    console.log('database connected')
})


const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next()
    }
}

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'You must be signed in first')
        return res.redirect('/login')
    }
    next()
}

const isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params
    const review = await Review.findById(reviewId)
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do this action')
        return res.redirect(`/index/${id}`)
    }
    next()
}

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')




app.get('/', catchAsync(async (req, res) => {

    res.render('home')
}))


app.get('/index', catchAsync(async (req, res) => {
    const AllAnime = await EachAnime.find({})
    res.render('index', { AllAnime })

}))

app.get('/favorite', catchAsync(async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'You must be logged in to access the favorites page')
        return res.redirect('/login')
    }
    res.render('favorite')
}))


app.get('/index/:id', catchAsync(async (req, res) => {
    // if (!req.isAuthenticated()) {
    //     req.session.returnTo = req.originalUrl
    //     req.flash('error', 'you must be logged in to access this page')
    //     return res.redirect('/login')
    // }
    const single = await EachAnime.findById(req.params.id).populate({ path: 'reviews', populate: { path: 'author' } })
    const category = single.genre
    res.render('individual', { single, category })
}))


app.get('/explore', catchAsync(async (req, res) => {
    // if (!req.isAuthenticated()) {
    //     req.session.returnTo = req.originalUrl
    //     req.flash('error', 'you must be logged in to access this page')
    //     return res.redirect('/login')
    // }

    const data = await EachAnime.find()
    const page = req.url

    const apiLink = 'https://api.jikan.moe/v4/genres/anime'
    const resp = await axios.get(apiLink)
    const genresAll = resp.data.data
    animeName = ""
    animeGenre = ""

    res.render('explore', { data: data, genres: genresAll, page: page })
}))

app.get('/searching', catchAsync(async (req, res) => {


    animeName = TitleCase(req.query.q)
    animeGenre = req.query.genre.slice(0, -1)
    const page = req.url
    const data = await EachAnime.find()

    const apiLink = 'https://api.jikan.moe/v4/genres/anime'
    const resp = await axios.get(apiLink)
    const genresAll = resp.data.data
    res.render('explore', { data: data, genres: genresAll, page: page })

}))

app.post('/index/:id/reviews', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    const anime = await EachAnime.findById(req.params.id)
    const review = new Review(req.body.review)
    review.author = req.user._id

    anime.reviews.push(review)
    await review.save()
    await anime.save()

    req.flash('success', 'Succesfully Added a Review')

    res.redirect(`/index/${anime._id}`)

}))




app.delete('/index/:id/reviews/:reviewId', isLoggedIn, isReviewAuthor, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params
    await EachAnime.findByIdAndUpdate(id, { $pull: { reviews: reviewId } })
    await Review.findByIdAndDelete(reviewId)

    req.flash('success', 'Succefully Deleted Your Review')

    res.redirect(`/index/${id}`)


}))

app.post('/index/:id/fav', isLoggedIn, catchAsync(async function (req, res) {


    const person = await User.findById(req.user._id)
    const anime = await EachAnime.findById(req.params.id)


    if (person.favs.indexOf(anime._id) > -1) {
        await User.findByIdAndUpdate(req.user._id, { $pull: { favs: anime._id } })
        req.flash('success', 'You unfavorited this anime')
        return res.redirect(`/index/${req.params.id}`)

    }


    person.favs.push(anime)
    await person.save()
    req.flash('success', 'You favorited this anime')
    return res.redirect(`/index/${req.params.id}`)
}))

app.get('/register', catchAsync(async (req, res) => {
    res.render('register')
}))

app.post('/register', [
    body('email').trim().isEmail().withMessage('Email must be a valid email').normalizeEmail().toLowerCase(),
    body('username').trim().isLength(1).withMessage('username must not be empty'),
    body('password').trim().isLength(1).withMessage('password must not be empty')
], catchAsync(async (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg)
        })
        return res.redirect('/register')
    }
    try {
        const { email, username, password } = req.body
        const user = new User({ email, username })
        const registerUser = await User.register(user, password)

        req.login(registerUser, err => {
            if (err) { return next(err) }
            req.flash('success', 'Welcome to AnimeNinja')
            res.redirect('/explore')

        })



    } catch (e) {
        req.flash('error', e.message)
        res.redirect('/register')

    }


}))


app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureFlash: 'retry logging in', failureRedirect: '/login' }), catchAsync(async (req, res) => {
    req.flash('success', `Welcome Back, ${req.user.username}!`)
    const redirectUrl = req.session.returnTo || '/explore'
    delete req.session.returnTo
    res.redirect(redirectUrl)
}))

app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            console.log(err)
            return next(err)
        }



    })

    res.redirect('/')

})


app.route('/db_data')
    .get(catchAsync(async (req, res) => {

        if (animeName.length === 0 && animeGenre.length === 0) {
            const tot = req.query.end

            const dbData = await EachAnime.find({}).limit(12).skip(tot)

            res.send({ status: 200, dbData: dbData })

        } else {
            if (animeGenre.length === 0) {
                const tot = req.query.end
                const dbData = await EachAnime.find({ "name": { "$regex": animeName } }).limit(12).skip(tot)
                res.send({ status: 200, dbData: dbData })

            }


            if (animeName.length === 0) {

                const tot = req.query.end
                console.log(1)

                const dbData = await EachAnime.find({ "genre": animeGenre }).limit(12).skip(tot)



                res.send({ status: 200, dbData: dbData })

            }

            if (animeName.length !== 0 && animeGenre.length !== 0) {
                const tot = req.query.end

                const dbData = await EachAnime.find({ "name": { "$regex": animeName }, "genre": animeGenre }).limit(12).skip(tot)
                res.send({ status: 200, dbData: dbData })
            }
        }




    }))


app.route('/db_fav')
    .get(catchAsync(async (req, res) => {
        const tot = req.query.end

        const dbData = await User.findById(req.user._id)
        await dbData.populate("favs")



        res.send({ status: 200, dbData: dbData.favs.slice(tot - 9, tot) })

    }))





app.all('*', (req, res, next) => {
    next(new ExpressError('page not found', 404))

})


app.use((err, req, res, next) => {
    const { statusCode = 500 } = err
    if (!err.message) err.message = "Oh No, Something Went Wrong!"
    res.status(statusCode).render('error', { err })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log('app is listening')
})