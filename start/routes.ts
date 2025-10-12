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
import { middleware } from './kernel.js'

router.get('/', async () => {
  return { message: 'Adonis is running' }
})

router.post('/api/send-email', [MailersController, 'sendEmail'])

// Contact form submission
router.post('/contact', [ContactSubmissionsController, 'store'])

// Admin route to view contact submissions (protected)
router.get('/admin/contact-submissions', [ContactSubmissionsController, 'index']).middleware([middleware.cookie_to_bearer(), middleware.auth()])

router.get('/auth/google/redirect', [UsersController, 'redirectToGoogle'])
router.get('/auth/google/callback', [UsersController, 'handleGoogleCallback'])

router.get('/me', [UsersController, 'me']).middleware([middleware.cookie_to_bearer(), middleware.auth()])

router.post('/auth/register', [UsersController, 'register'])
router.post('/auth/login', [UsersController, 'login'])
router.post('/auth/logout', [UsersController, 'logout']).middleware([middleware.cookie_to_bearer(), middleware.auth()])

// Profile update route
router.post('/profile/update', [UsersController, 'updateProfile']).middleware([middleware.cookie_to_bearer(), middleware.auth()])
router.post('/profile/password/update', [UsersController, 'updatePassword']).middleware([middleware.cookie_to_bearer(), middleware.auth()])
router.post('/profile/password/create', [UsersController, 'createPassword']).middleware([middleware.cookie_to_bearer(), middleware.auth()])

router.post('/verify-otp', [UsersController, 'verifyOtp'])
router.get('/verify-otp', [UsersController, 'verifyLink'])
router.post('/resend-otp', [UsersController, 'resendOtp'])
