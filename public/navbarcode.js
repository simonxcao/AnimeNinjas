const menu = document.querySelector('#mobile-menu')
const menuLinks = document.querySelector('.navbar_menu')


const yes = document.querySelector('.flash_alertbtn')
const no = document.querySelector('.flash_alert_errorbtn')



menu.addEventListener('click', function () {
    menu.classList.toggle('is-active')
    menuLinks.classList.toggle('active')
})


yes.addEventListener('click', function () {
    this.parentElement.remove()
})

no.addEventListener('click', function () {
    console.log('poop')
    this.parentElement.remove()
})
