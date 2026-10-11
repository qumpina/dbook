import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { routePaths } from '@/router/routes'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import RoomsView from '@/views/RoomsView.vue'
import ScheduleView from '@/views/ScheduleView.vue'
import MyBookingsView from '@/views/MyBookingsView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminView from '@/views/AdminView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: routePaths.rooms,
  },
  {
    path: routePaths.login,
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: routePaths.register,
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true },
  },
  {
    path: routePaths.rooms,
    name: 'rooms',
    component: RoomsView,
    meta: { requiresAuth: true, roles: ['USER', 'TRAINER', 'ADMIN'] },
  },
  {
    path: routePaths.schedule,
    name: 'schedule',
    component: ScheduleView,
    meta: { requiresAuth: true, roles: ['TRAINER', 'ADMIN'] },
  },
  {
    path: routePaths.myBookings,
    name: 'myBookings',
    component: MyBookingsView,
    meta: { requiresAuth: true, roles: ['USER', 'TRAINER', 'ADMIN'] },
  },
  {
    path: routePaths.profile,
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true, roles: ['USER', 'TRAINER', 'ADMIN'] },
  },
  {
    path: routePaths.admin,
    name: 'admin',
    component: AdminView,
    meta: { requiresAuth: true, roles: ['ADMIN'] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: routePaths.rooms,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const session = useSessionStore()
  const redirectTarget = typeof to.fullPath === 'string' ? to.fullPath : routePaths.rooms

  if (to.meta.guestOnly && session.isAuthenticated) {
    next({ name: 'rooms' })
    return
  }

  if (to.meta.requiresAuth && !session.isAuthenticated) {
    session.setFlash('Сначала войдите в систему.')
    next({ name: 'login', query: { redirect: redirectTarget } })
    return
  }

  const userRole = session.currentUser?.role
  const allowedRoles = to.meta.roles as string[] | undefined

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    session.setFlash('У вас нет доступа к этой странице.')
    next({ name: 'rooms' })
    return
  }

  next()
})

export default router
