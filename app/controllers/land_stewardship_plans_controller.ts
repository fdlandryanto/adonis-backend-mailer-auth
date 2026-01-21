import type { HttpContext } from '@adonisjs/core/http'
import LandStewardshipPlan from '#models/land_stewardship_plan'
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import string from '@adonisjs/core/helpers/string'

export default class LandStewardshipPlansController {

    private async _findPlan(auth: any, request: any) {
        if (auth.user) {
            return await LandStewardshipPlan.query()
            .where('userId', auth.user.id)
            .where('status', 'draft')
            .orderBy('created_at', 'desc')
            .first()
        }

        const planId = request.header('x-plan-id') || request.input('plan_id')
        const token = request.header('x-edit-token') || request.input('edit_token')

        if (planId && token) {
            return await LandStewardshipPlan.query()
            .where('id', planId)
            .where('editToken', token)
            .first()
        }

        return null
    }

    public async show({ auth, request, response }: HttpContext) {
        const plan = await this._findPlan(auth, request)

        if (!plan) return response.noContent()

        return response.ok({
            ...plan.serialize(),
            edit_token: plan.editToken
        })
    }

    public async step1({ auth, request, response }: HttpContext) {
        const user = auth.user

        const schema = vine.object({
            full_name: vine.string().trim(),
            phone_number: vine.string().trim(),
            email: vine.string().email(),
            is_returning_steward: vine.boolean()
        })
        const payload = await request.validateUsing(vine.compile(schema))

        let plan: LandStewardshipPlan | null = null

        if (user) {
            if (payload.is_returning_steward === false) {
                plan = await LandStewardshipPlan.create({
                    userId: user.id,
                    status: 'draft',
                    currentStep: 1,
                    fullName: payload.full_name,
                    phoneNumber: payload.phone_number,
                    email: payload.email,
                    isReturningSteward: payload.is_returning_steward
                })
            } else {
                plan = await LandStewardshipPlan.updateOrCreate(
                    { userId: user.id, status: 'draft' },
                    {
                        currentStep: 1,
                        fullName: payload.full_name,
                        phoneNumber: payload.phone_number,
                        email: payload.email,
                        isReturningSteward: payload.is_returning_steward
                    }
                )
            }
        } else {
            const existingPlan = await this._findPlan(auth, request)

            if (existingPlan) {
                existingPlan.merge({
                    fullName: payload.full_name,
                    phoneNumber: payload.phone_number,
                    email: payload.email,
                    isReturningSteward: payload.is_returning_steward
                })
                await existingPlan.save()
                plan = existingPlan
            } else {
                plan = await LandStewardshipPlan.create({
                    fullName: payload.full_name,
                    phoneNumber: payload.phone_number,
                    email: payload.email,
                    isReturningSteward: payload.is_returning_steward,
                    status: 'draft',
                    currentStep: 1,
                    editToken: string.random(32)
                })
            }
        }

        if (!plan.caseNumber) {
            plan.caseNumber = `TAS-${new Date().getFullYear()}-${plan.id.toString().padStart(4, '0')}`
            await plan.save()
        }

        return response.ok({
            success: true,
            plan_id: plan.id,
            case_number: plan.caseNumber,
            edit_token: plan.editToken
        })
    }

    public async step2({ auth, request, response }: HttpContext) {
        const plan = await this._findPlan(auth, request)
        if (!plan) return response.unauthorized({ message: 'Session expired or plan not found' })

        const schema = vine.object({
            county: vine.string(),
            property_address: vine.string(),
            approximate_acreage: vine.number(),
            primary_current_land_use: vine.string(),
            land_management_goals: vine.array(vine.string()),
            other_goals_text: vine.string().optional()
        })
        const payload = await request.validateUsing(vine.compile(schema))

        await plan.merge({
            county: payload.county,
            propertyAddress: payload.property_address,
            approximateAcreage: payload.approximate_acreage,
            primaryCurrentLandUse: payload.primary_current_land_use,
            landManagementGoals: payload.land_management_goals,
            otherGoalsText: payload.other_goals_text || null,
            currentStep: Math.max(plan.currentStep, 2)
        }).save()

        return response.ok({ success: true })
    }

    public async step3({ auth, request, response }: HttpContext) {
        const plan = await this._findPlan(auth, request)
        if (!plan) return response.unauthorized({ message: 'Session expired or plan not found' })

        const textSchema = vine.object({
            gate_access_notes: vine.string().optional(),
            known_utilities: vine.string().optional(),
            hazards_awareness: vine.string().optional(),
            gps_pin_link: vine.string().optional(),
        })
        const payload = await request.validateUsing(vine.compile(textSchema))
        const photosPath = app.makePath('uploads/plans/photos')
        const mapsPath = app.makePath('uploads/plans/maps')

        const photos = request.files('uploaded_photos', {
            size: '10mb',
            extnames: ['jpg', 'png', 'jpeg', 'webp']
        })

        let photoPaths: string[] = plan.uploadedPhotos || []
        for (const photo of photos) {
            if (photo.isValid) {
                const fileName = `${cuid()}.${photo.extname}`
                await photo.move(photosPath, { name: fileName })
                photoPaths.push(fileName)
            }
        }

        const mapScreenshot = request.file('map_screenshot', {
            size: '10mb',
            extnames: ['jpg', 'png', 'jpeg', 'pdf']
        })
        let mapPath = plan.mapScreenshotPath
        if (mapScreenshot && mapScreenshot.isValid) {
            const fileName = `${cuid()}_map.${mapScreenshot.extname}`
            await mapScreenshot.move(mapsPath, { name: fileName })
            mapPath = fileName
        }

        await plan.merge({
            gateAccessNotes: payload.gate_access_notes,
            knownUtilities: payload.known_utilities,
            hazardsAwareness: payload.hazards_awareness,
            gpsPinLink: payload.gps_pin_link,
            uploadedPhotos: photoPaths,
            mapScreenshotPath: mapPath,
            currentStep: Math.max(plan.currentStep, 3)
        }).save()

        return response.ok({ success: true })
    }

    public async step4({ auth, request, response }: HttpContext) {
        const plan = await this._findPlan(auth, request)
        if (!plan) return response.unauthorized({ message: 'Session expired or plan not found' })

        const schema = vine.object({
            agrees_to_contact: vine.boolean(),
            subscribes_to_newsletter: vine.boolean(),
            agrees_to_sms: vine.boolean()
        })
        const payload = await request.validateUsing(vine.compile(schema))

        await plan.merge({
            agreesToContact: payload.agrees_to_contact,
            subscribesToNewsletter: payload.subscribes_to_newsletter,
            agreesToSms: payload.agrees_to_sms,
            status: 'submitted',
            currentStep: 4,
        }).save()

        return response.ok({ success: true, case_number: plan.caseNumber })
    }
}