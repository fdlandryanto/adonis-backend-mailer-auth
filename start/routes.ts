/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import MailersController from '#controllers/mailers_controller'
import UsersController from '#controllers/users_controller'
import ContactSubmissionsController from '#controllers/contact_submissions_controller'
import AdminController from '#controllers/admin_controller'
import { middleware } from './kernel.js'

router.get('/', async () => {
  return { message: 'Adonis is running' }
})

router.post('/api/send-email', [MailersController, 'sendEmail'])
router.post('/contact', [ContactSubmissionsController, 'store'])
router.get('/auth/google/redirect', [UsersController, 'redirectToGoogle'])
router.get('/auth/google/callback', [UsersController, 'handleGoogleCallback'])
router.post('/auth/register', [UsersController, 'register'])
router.post('/auth/login', [UsersController, 'login'])
router.post('/verify-otp', [UsersController, 'verifyOtp'])
router.get('/verify-otp', [UsersController, 'verifyLink'])
router.post('/resend-otp', [UsersController, 'resendOtp'])

router.group(() => {
    router.get('/me', [UsersController, 'me'])
    router.post('/auth/logout', [UsersController, 'logout'])

    router.post('/profile/update', [UsersController, 'updateProfile'])
    router.post('/profile/password/update', [UsersController, 'updatePassword'])
    router.post('/profile/password/create', [UsersController, 'createPassword'])
    router.post('/profile/avatar/upload', [UsersController, 'uploadAvatar'])
    router.post('/profile/avatar/url', [UsersController, 'updateAvatarUrl'])
    router.post('/profile/land', [UsersController, 'updateLandProfile'])

    router.get('/admin/contact-submissions', [ContactSubmissionsController, 'index'])

    router.get('/admin/dashboard', [AdminController, 'dashboard']).middleware(middleware.adminAuth)
  }).middleware([middleware.cookie_to_bearer(), middleware.auth()])