package com.dasibom

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Dasibom"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // ⚠️ Play Store 출시 직전에 다시 켤 것 (스크린샷/화면녹화 방지 — 데이팅 앱 보안)
    // QA 동안엔 사용자가 캡처해서 이슈 보고할 수 있도록 일시 비활성화.
    // 출시 직전 fixed BUILD_TYPE.release 조건으로 부활시키기:
    //   if (!BuildConfig.DEBUG) {
    //     window.setFlags(
    //       WindowManager.LayoutParams.FLAG_SECURE,
    //       WindowManager.LayoutParams.FLAG_SECURE
    //     )
    //   }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
