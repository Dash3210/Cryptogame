package com.braincipher

import android.app.Activity
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.games.PlayGames

class PlayGamesModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "PlayGamesModule"
        private const val TAG = "PlayGamesModule"
        private const val RC_LEADERBOARD = 9001
        private const val RC_ALL_LEADERBOARDS = 9002
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun signIn(promise: Promise) {
        val activity: Activity = reactApplicationContext.currentActivity ?: run {
            promise.reject("ACTIVITY_NULL", "Activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                PlayGames.getGamesSignInClient(activity).signIn()
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            val result = task.result
                            if (result?.isAuthenticated == true) {
                                PlayGames.getPlayersClient(activity).currentPlayer
                                    .addOnCompleteListener { playerTask ->
                                        if (playerTask.isSuccessful) {
                                            val player = playerTask.result
                                            val name = player?.displayName?.takeIf { it.isNotBlank() } ?: "Authenticated Player"
                                            promise.resolve(name)
                                        } else {
                                            promise.resolve("Authenticated Player")
                                        }
                                    }
                            } else {
                                promise.reject("NOT_AUTHENTICATED", "Sign-in succeeded but not authenticated")
                            }
                        } else {
                            promise.reject("SIGN_IN_FAILED", task.exception?.message ?: "Unknown sign-in error", task.exception)
                        }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "signIn exception", e)
                promise.reject("EXCEPTION", e.message ?: "Sign-in exception", e)
            }
        }
    }

    @ReactMethod
    fun getPlayerName(promise: Promise) {
        val activity: Activity = reactApplicationContext.currentActivity ?: run {
            promise.reject("ACTIVITY_NULL", "Activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                PlayGames.getPlayersClient(activity).currentPlayer
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            val player = task.result
                            val name = player?.displayName?.takeIf { it.isNotBlank() } ?: "Player"
                            promise.resolve(name)
                        } else {
                            promise.reject("GET_PLAYER_FAILED", task.exception?.message ?: "Sign-in required", task.exception)
                        }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "getPlayerName exception", e)
                promise.reject("EXCEPTION", e.message ?: "Player name retrieval exception", e)
            }
        }
    }

    @ReactMethod
    fun submitScore(leaderboardId: String, score: Double) {
        if (score.isNaN() || score.isInfinite() || score < 0) {
            Log.w(TAG, "Invalid score skipped: $score")
            return
        }

        val activity: Activity = reactApplicationContext.currentActivity ?: return

        activity.runOnUiThread {
            try {
                PlayGames.getLeaderboardsClient(activity)
                    .submitScore(leaderboardId, score.toLong())
            } catch (e: Exception) {
                Log.e(TAG, "submitScore failed for leaderboard $leaderboardId", e)
            }
        }
    }

    @ReactMethod
    fun showLeaderboard(leaderboardId: String, promise: Promise) {
        val activity: Activity = reactApplicationContext.currentActivity ?: run {
            promise.reject("ACTIVITY_NULL", "Activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                if (activity.isFinishing || activity.isDestroyed) {
                    promise.reject("ACTIVITY_INVALID", "Activity is finishing or destroyed")
                    return@runOnUiThread
                }

                PlayGames.getLeaderboardsClient(activity)
                    .getLeaderboardIntent(leaderboardId)
                    .addOnSuccessListener { intent ->
                        if (!activity.isFinishing && !activity.isDestroyed && intent != null) {
                            activity.startActivityForResult(intent, RC_LEADERBOARD)
                            promise.resolve(true)
                        } else {
                            promise.reject("ACTIVITY_INVALID", "Cannot start leaderboard intent on inactive activity")
                        }
                    }
                    .addOnFailureListener { exception ->
                        promise.reject("SHOW_LEADERBOARD_FAILED", exception.message ?: "Failed to open leaderboard", exception)
                    }
            } catch (e: Exception) {
                Log.e(TAG, "showLeaderboard exception", e)
                promise.reject("EXCEPTION", e.message ?: "Show leaderboard exception", e)
            }
        }
    }

    @ReactMethod
    fun isAuthenticated(promise: Promise) {
        val activity: Activity = reactApplicationContext.currentActivity ?: run {
            promise.resolve(false)
            return
        }

        activity.runOnUiThread {
            try {
                PlayGames.getGamesSignInClient(activity).isAuthenticated
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful && task.result?.isAuthenticated == true) {
                            promise.resolve(true)
                        } else {
                            promise.resolve(false)
                        }
                    }
            } catch (e: Exception) {
                Log.w(TAG, "isAuthenticated check exception: ${e.message}")
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun showAllLeaderboards(promise: Promise) {
        val activity: Activity = reactApplicationContext.currentActivity ?: run {
            promise.reject("ACTIVITY_NULL", "Activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                if (activity.isFinishing || activity.isDestroyed) {
                    promise.reject("ACTIVITY_INVALID", "Activity is finishing or destroyed")
                    return@runOnUiThread
                }

                PlayGames.getLeaderboardsClient(activity)
                    .allLeaderboardsIntent
                    .addOnSuccessListener { intent ->
                        if (!activity.isFinishing && !activity.isDestroyed && intent != null) {
                            activity.startActivityForResult(intent, RC_ALL_LEADERBOARDS)
                            promise.resolve(true)
                        } else {
                            promise.reject("ACTIVITY_INVALID", "Cannot start all-leaderboards intent on inactive activity")
                        }
                    }
                    .addOnFailureListener { exception ->
                        promise.reject("SHOW_LEADERBOARDS_FAILED", exception.message ?: "Failed to open leaderboards", exception)
                    }
            } catch (e: Exception) {
                Log.e(TAG, "showAllLeaderboards exception", e)
                promise.reject("EXCEPTION", e.message ?: "Show all leaderboards exception", e)
            }
        }
    }
}
