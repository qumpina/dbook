import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

test('registration, restored protected route, logout and login use the real API', async ({ page }) => {
  const email = `browser-${randomUUID()}@example.com`
  const password = `Test-${randomUUID()}`
  await page.goto('/register')
  await page.getByLabel('Имя', { exact: true }).fill('Тест')
  await page.getByLabel('Фамилия', { exact: true }).fill('Пользователь')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page).toHaveURL(/\/rooms$/)
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByText(`Email: ${email}`)).toBeVisible()
  await page.reload()
  await expect(page.getByText(`Email: ${email}`)).toBeVisible()
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill('incorrect-password')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Неверный email или пароль')
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByText(`Email: ${email}`)).toBeVisible()
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()

  await page.goto('/register')
  await page.getByLabel('Имя', { exact: true }).fill('Тест')
  await page.getByLabel('Фамилия', { exact: true }).fill('Пользователь')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page.getByRole('alert')).toContainText('Аккаунт с таким email уже существует')
})

test('mobile form validates required fields without sending a request', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  let requests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/auth/register')) requests++
  })
  await page.goto('/register')
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page.getByText('Введите корректный email')).toBeVisible()
  await expect(page.getByText('Пароль должен содержать от 6 до 100 символов')).toBeVisible()
  expect(requests).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
