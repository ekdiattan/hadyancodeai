import type { AuthState, UserOrganization } from "@shared/proto/hadyancode/account"
import { EmptyRequest } from "@shared/proto/hadyancode/common"
import deepEqual from "fast-deep-equal"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { AccountServiceClient } from "@/services/grpc-client"

// Define User type (you may need to adjust this based on your actual User type)
export interface HadyanCodeUser {
	uid: string
	email?: string
	displayName?: string
	photoUrl?: string
	appBaseUrl?: string
}

export interface HadyanCodeAuthContextType {
	hadyancodeUser: HadyanCodeUser | null
	organizations: UserOrganization[] | null
	activeOrganization: UserOrganization | null
}

export const HadyanCodeAuthContext = createContext<HadyanCodeAuthContextType | undefined>(undefined)

export const HadyanCodeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<HadyanCodeUser | null>(null)
	const [userOrganizations, setUserOrganizations] = useState<UserOrganization[] | null>(null)
	const organizationsRequestIdRef = useRef(0)

	const getUserOrganizations = useCallback(async () => {
		const requestId = ++organizationsRequestIdRef.current
		try {
			const response = await AccountServiceClient.getUserOrganizations(EmptyRequest.create())
			if (requestId !== organizationsRequestIdRef.current) {
				return
			}
			setUserOrganizations((old) => {
				if (!deepEqual(response.organizations, old)) {
					return response.organizations
				}

				return old
			})
		} catch (error) {
			console.error("Failed to fetch user organizations:", error)
		}
	}, [])

	const activeOrganization = useMemo(() => {
		return userOrganizations?.find((org) => org.active) ?? null
	}, [userOrganizations])

	useEffect(() => {
		console.log("Extension: HadyanCodeAuthContext: user updated:", user?.uid)
	}, [user?.uid])

	// Handle auth status update events
	useEffect(() => {
		const cancelSubscription = AccountServiceClient.subscribeToAuthStatusUpdate(EmptyRequest.create(), {
			onResponse: (response: AuthState) => {
				const responseUser = response.user
				if (!responseUser?.uid) {
					organizationsRequestIdRef.current++
					setUser(null)
					setUserOrganizations(null)
					return
				}

				// Refresh organizations on every auth status update, not just user
				// changes. Switching organizations doesn't change the uid, so gating
				// this on uid changes leaves stale `active` flags — which reset the
				// account view's org dropdown on remount. The deepEqual guard in
				// getUserOrganizations prevents no-op re-renders.
				getUserOrganizations()

				setUser((oldUser) => (oldUser?.uid !== responseUser.uid ? responseUser : oldUser))
			},
			onError: (error: Error) => {
				console.error("Error in auth callback subscription:", error)
			},
			onComplete: () => {
				console.log("Auth callback subscription completed")
			},
		})

		// Cleanup function to cancel subscription when component unmounts
		return () => {
			organizationsRequestIdRef.current++
			cancelSubscription()
		}
	}, [getUserOrganizations])

	return (
		<HadyanCodeAuthContext.Provider
			value={{
				hadyancodeUser: user,
				organizations: userOrganizations,
				activeOrganization,
			}}>
			{children}
		</HadyanCodeAuthContext.Provider>
	)
}

export const useHadyanCodeAuth = () => {
	const context = useContext(HadyanCodeAuthContext)
	if (context === undefined) {
		throw new Error("useHadyanCodeAuth must be used within a HadyanCodeAuthProvider")
	}
	return context
}

export const useHadyanCodeSignIn = () => {
	const [isLoading, setIsLoading] = useState(false)
	const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null)

	const handleSignIn = useCallback(() => {
		try {
			setIsLoading(true)
			setAuthStatusMessage(null)

			AccountServiceClient.accountLoginClicked(EmptyRequest.create())
				.then((response) => {
					setAuthStatusMessage(response.value || "Complete sign-in in your browser.")
				})
				.catch((err) => {
					console.error("Failed to start login:", err)
					setAuthStatusMessage("Unable to start sign-in. Please try again.")
				})
				.finally(() => {
					setIsLoading(false)
				})
		} catch (error) {
			console.error("Error signing in:", error)
			setAuthStatusMessage("Unable to start sign-in. Please try again.")
			setIsLoading(false)
		}
	}, [])

	return {
		isLoginLoading: isLoading,
		authStatusMessage,
		handleSignIn,
	}
}

export const handleSignOut = async () => {
	try {
		await AccountServiceClient.accountLogoutClicked(EmptyRequest.create()).catch((err) =>
			console.error("Failed to logout:", err),
		)
	} catch (error) {
		console.error("Error signing out:", error)
		throw error
	}
}
