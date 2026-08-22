/**
 * Vendég-vásárlás aktiváló token — NEM az import 30 napja, NEM az 1 órás
 * forgot-password. Ugyanaz a 7 nap, mint a lead-magnet (`FREE_COURSE_TOKEN_TTL`),
 * de ez a modul szándékosan független attól: a két folyamat külön élettartamot
 * tarthat, ha később szét kell őket választani.
 */

export const GUEST_ACTIVATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const GUEST_ACTIVATION_TOKEN_TTL_DAYS = 7
