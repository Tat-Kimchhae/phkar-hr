<script setup lang="ts">
import { z } from 'zod'
import { demoAccounts, homeFor, useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const { t } = useI18n()
const notify = useNotify()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const demoUsers = demoAccounts.map(({ name, role, email: accountEmail, password: accountPassword }) => ({
  name,
  role,
  email: accountEmail,
  password: accountPassword,
}))

async function submitLogin() {
  errorMessage.value = ''
  const result = loginSchema.safeParse({ email: email.value, password: password.value })

  if (!result.success) {
    errorMessage.value = t('auth.invalidFields')
    notify.error(t('toast.validationFailed'), undefined, 'auth-login-validation')
    return
  }

  isSubmitting.value = true
  try {
    const success = await auth.login(result.data.email, result.data.password)
    if (!success) {
      errorMessage.value = t('auth.invalidCredentials')
      notify.error(t('toast.loginFailed'), undefined, 'auth-login-failed')
      return
    }

    const user = auth.user
    const targetRoute = user ? homeFor(user.role) : null

    if (!user || !auth.token || !targetRoute) {
      throw new Error('Login succeeded without a persisted authentication session.')
    }

    notify.success(t('toast.loginSuccess'), undefined, 'auth-login-success')
    await navigateTo(targetRoute, { replace: true })
  } catch {
    errorMessage.value = t('common.loadError')
    notify.error(t('toast.loginFailed'), undefined, 'auth-login-failed')
  } finally {
    isSubmitting.value = false
  }
}

function selectAccount(account: typeof demoUsers[number]) {
  email.value = account.email
  password.value = account.password
  errorMessage.value = ''
}
</script>

<template>
  <UApp>
    <main class="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-slate-900">
      <div class="w-full max-w-md">
        <div class="mb-7 text-center">
          <div class="mx-auto grid size-12 place-items-center rounded-xl bg-emerald-600 text-xl font-bold text-white">P</div>
          <h1 class="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{{ t('app.name') }}</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('auth.signIn') }}</p>
        </div>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <form class="space-y-4" @submit.prevent="submitLogin">
            <div>
              <label for="email" class="mb-1.5 block text-sm font-medium">{{ t('auth.email') }}</label>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="username"
                required
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900"
              >
            </div>
            <div>
              <label for="password" class="mb-1.5 block text-sm font-medium">{{ t('auth.password') }}</label>
              <input
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900"
              >
            </div>
            <p v-if="errorMessage" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isSubmitting ? t('auth.signingIn') : t('auth.signIn') }}
            </button>
          </form>

          <div class="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h2 class="text-sm font-semibold">{{ t('auth.demoAccounts') }}</h2>
            <ul class="mt-3 space-y-2">
              <li v-for="account in demoUsers" :key="account.role">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                  @click="selectAccount(account)"
                >
                  <span>
                    <span class="block font-medium">{{ t(`auth.roles.${account.role}`) }}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">{{ account.email }}</span>
                  </span>
                  <span class="text-xs text-emerald-700 dark:text-emerald-400">{{ t('auth.useAccount') }}</span>
                </button>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  </UApp>
</template>
