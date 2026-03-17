const mockNavigationRuntime = {
  actions: [] as Array<{ type: string; payload: unknown }>,
  ready: false,
  rootState: undefined as unknown,
}

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    navigate: (payload: unknown) => ({
      type: "NAVIGATE",
      payload,
    }),
    reset: (payload: unknown) => ({
      type: "RESET",
      payload,
    }),
  },
  createNavigationContainerRef: () => ({
    isReady: () => mockNavigationRuntime.ready,
    dispatch: (action: { type: string; payload: unknown }) => {
      mockNavigationRuntime.actions.push(action)
      return action
    },
    getRootState: () => mockNavigationRuntime.rootState,
  }),
}))

import { describeRootRouteDescriptor } from "@/app/navigation/routeDescriptor"
import {
  getCurrentRouteDescriptor,
  navigateRoot,
  resetToAuthStack,
  resetToMainTabs,
  resetToRecoverableRoute,
  resetToRootRoute,
  resetToRootRoutes,
  resetToSupport,
  resetToSupportScreen,
} from "@/app/navigation/navigationRef"
import { resolveSupportRoute } from "@/features/support/utils/supportRoutes"
import { useNavigationStateStore } from "@/app/navigation/useNavigationStateStore"

function resetMockNavigationRuntime() {
  mockNavigationRuntime.actions = []
  mockNavigationRuntime.ready = false
  mockNavigationRuntime.rootState = undefined
}

describe("navigationRef and supportRoutes integration", () => {
  beforeEach(() => {
    resetMockNavigationRuntime()
    useNavigationStateStore.setState({
      lastRouteName: null,
      pendingSupportReason: null,
      recoverableRoute: null,
      pendingProtectedUrl: null,
    })
  })

  it("does not dispatch navigation actions before the container is ready", () => {
    expect(
      navigateRoot("MainTabs", {
        screen: "HomeTab",
      }),
    ).toBe(false)

    resetToAuthStack()
    resetToMainTabs()
    resetToSupport("no_network")
    resetToRootRoute({
      name: "AuthStack",
      params: {
        screen: "LoginScreen",
      },
    })
    resetToRootRoutes([
      {
        name: "SupportStack",
        params: {
          screen: "MaintenanceScreen",
        },
      },
    ])
    resetToSupportScreen("NoWechatScreen")

    expect(mockNavigationRuntime.actions).toEqual([])
  })

  it("dispatches root navigation and normalized resets when the container is ready", () => {
    mockNavigationRuntime.ready = true

    expect(
      navigateRoot("MainTabs", {
        screen: "HomeTab",
      }),
    ).toBe(true)
    expect(
      navigateRoot("SupportStack", {
        screen: "NoNetworkScreen",
        params: { mode: "details" },
      }),
    ).toBe(true)

    resetToAuthStack()
    resetToMainTabs()

    const routes = [
      {
        name: "AuthStack" as const,
        params: {
          screen: "LoginScreen" as const,
        },
      },
      {
        name: "SupportStack" as const,
        params: {
          screen: "MaintenanceScreen" as const,
        },
      },
    ]

    resetToRootRoutes(routes, -1)
    resetToRootRoutes(routes, 99)
    resetToRootRoutes(routes)
    resetToRootRoute({
      name: "AuthStack",
      params: {
        screen: "PasskeyIntroScreen",
      },
    })
    resetToSupportScreen("NoWechatScreen")
    resetToSupportScreen("NoNetworkScreen", { mode: "details" })

    const actionCountBeforeEmptyReset = mockNavigationRuntime.actions.length
    resetToRootRoutes([])

    expect(mockNavigationRuntime.actions).toEqual([
      {
        type: "NAVIGATE",
        payload: {
          name: "MainTabs",
          params: undefined,
        },
      },
      {
        type: "NAVIGATE",
        payload: {
          name: "SupportStack",
          params: {
            screen: "NoNetworkScreen",
            params: { mode: "details" },
          },
        },
      },
      {
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "AuthStack", params: { screen: "LoginScreen" } }],
        },
      },
      {
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
        },
      },
      {
        type: "RESET",
        payload: {
          index: 0,
          routes,
        },
      },
      {
        type: "RESET",
        payload: {
          index: 1,
          routes,
        },
      },
      {
        type: "RESET",
        payload: {
          index: 1,
          routes,
        },
      },
      {
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "AuthStack", params: { screen: "PasskeyIntroScreen" } }],
        },
      },
      {
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "SupportStack", params: { screen: "NoWechatScreen" } }],
        },
      },
      {
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "SupportStack", params: { screen: "NoNetworkScreen", params: { mode: "details" } } }],
        },
      },
    ])
    expect(mockNavigationRuntime.actions).toHaveLength(actionCountBeforeEmptyReset)
  })

  it("maps support reasons into support stack routes", () => {
    mockNavigationRuntime.ready = true

    const cases = [
      ["no_network", { screen: "NoNetworkScreen", params: { mode: "summary" } }],
      ["no_network_info", { screen: "NoNetworkScreen", params: { mode: "details" } }],
      ["route_load_failed", { screen: "NoNetworkScreen", params: { mode: "details" } }],
      ["unsupported_environment", { screen: "NoWechatScreen" }],
      ["wechat_interceptor", { screen: "WechatInterceptorScreen" }],
      ["not_found", { screen: "NotFoundScreen" }],
      ["add_desktop", { screen: "AddDesktopGuideScreen" }],
      ["manual_reason", { screen: "MaintenanceScreen", params: { reason: "manual_reason" } }],
      [undefined, { screen: "MaintenanceScreen", params: undefined }],
    ] as const

    for (const [reason, expectedRoute] of cases) {
      expect(resolveSupportRoute(reason)).toEqual(expectedRoute)
      resetToSupport(reason)
    }

    expect(mockNavigationRuntime.actions).toEqual(
      cases.map(([, route]) => ({
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "SupportStack", params: route }],
        },
      })),
    )
  })

  it("describes current routes and replays recoverable routes from the navigation state store", () => {
    const store = useNavigationStateStore.getState()

    store.setLastRouteName("SupportStack")
    store.setPendingSupportReason("not_found")
    store.setPendingProtectedUrl("/orders/ORDER_1")

    expect(useNavigationStateStore.getState()).toMatchObject({
      lastRouteName: "SupportStack",
      pendingSupportReason: "not_found",
      pendingProtectedUrl: "/orders/ORDER_1",
    })

    expect(resetToRecoverableRoute()).toBe(false)

    store.setRecoverableRoute({
      name: "SupportStack",
      params: {
        screen: "NoNetworkScreen",
        params: { mode: "details" },
      },
    })

    expect(useNavigationStateStore.getState().recoverableRoute).toEqual({
      name: "SupportStack",
      params: {
        screen: "NoNetworkScreen",
        params: { mode: "details" },
      },
    })

    mockNavigationRuntime.ready = true

    expect(resetToRecoverableRoute()).toBe(true)
    expect(mockNavigationRuntime.actions).toEqual([
      {
        type: "RESET",
        payload: {
          index: 0,
          routes: [{ name: "SupportStack", params: { screen: "NoNetworkScreen", params: { mode: "details" } } }],
        },
      },
    ])

    mockNavigationRuntime.rootState = null
    expect(getCurrentRouteDescriptor()).toBeNull()

    mockNavigationRuntime.rootState = { routes: [] }
    expect(getCurrentRouteDescriptor()).toBeNull()

    mockNavigationRuntime.rootState = {
      routes: [{ name: "MainTabs" }],
    }
    expect(getCurrentRouteDescriptor()).toEqual({
      name: "MainTabs",
      params: undefined,
    })

    mockNavigationRuntime.rootState = {
      index: 5,
      routes: [{ name: "SupportStack" }],
    }
    expect(getCurrentRouteDescriptor()).toEqual({
      name: "SupportStack",
      params: undefined,
    })

    mockNavigationRuntime.rootState = {
      index: 0,
      routes: [undefined],
    }
    expect(getCurrentRouteDescriptor()).toBeNull()

    mockNavigationRuntime.rootState = {
      routes: [
        {
          name: "SupportStack",
          state: {
            routes: [{ name: "NoWechatScreen" }],
          },
        },
      ],
    }
    expect(getCurrentRouteDescriptor()).toEqual({
      name: "SupportStack",
      params: {
        screen: "NoWechatScreen",
        params: undefined,
      },
    })

    mockNavigationRuntime.rootState = {
      routes: [
        {
          name: "AuthStack",
          params: { screen: "LoginScreen" },
        },
        {
          name: "SupportStack",
          params: { reason: "legacy" },
          state: {
            routes: [
              { name: "MaintenanceScreen" },
              { name: "NoNetworkScreen", params: { mode: "details" } },
            ],
          },
        },
      ],
    }

    expect(getCurrentRouteDescriptor()).toEqual({
      name: "SupportStack",
      params: {
        screen: "NoNetworkScreen",
        params: { mode: "details" },
      },
    })
    expect(describeRootRouteDescriptor(null)).toBeUndefined()
    expect(
      describeRootRouteDescriptor({
        name: "SupportStack",
        params: undefined,
      }),
    ).toBe("SupportStack")
    expect(
      describeRootRouteDescriptor({
        name: "SupportStack",
        params: {
          screen: "NoNetworkScreen",
          params: {
            screen: "AddDesktopGuideScreen",
          },
        },
      } as never),
    ).toBe("SupportStack > NoNetworkScreen > AddDesktopGuideScreen")
  })
})
