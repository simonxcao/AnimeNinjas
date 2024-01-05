
const swiper = new Swiper('.swiper', {
    loop: true,

    // If we need pagination
    // pagination: {
    //     el: '.swiper-pagination',
    // },

    // Navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },


})


var textarea = document.getElementById('body');

textarea.addEventListener('input', function () {
    // Automatically scroll down to keep the cursor at the bottom
    textarea.scrollTop = textarea.scrollHeight;
});