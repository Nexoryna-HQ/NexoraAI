import React from "react"
import { NotificationContainer } from "./components/NotifyToast/NotifyToast"
import "./App.css"
import Mainpage from "./pages/Mainpage/Mainpage"

function App() {
  return (
    <div className="App">
      <Mainpage />
      <NotificationContainer />
    </div>
  )
}

export default App
