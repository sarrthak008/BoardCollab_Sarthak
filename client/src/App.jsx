import React from 'react'
import "./App.css"
import { Provider } from "react-redux"
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from './views/Home';
import store from './store/store';
import { Toaster } from "sileo"
import Register from './views/Register';
import Rooms from './views/Rooms';
import Board from './views/whiteBoard/Board';

const App = () => {
  return (
    <Provider store={store}>
      <Toaster position="top-right"
        options={{
          fill: "#171717",
          styles: { description: "text-white/75!" },
        }}  
      />
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/register' element={<Register />} />
          <Route path='/rooms'element={<Rooms/>}/>
          <Route path='/board' element={<Board/>}/>
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}

export default App