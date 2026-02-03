import { createContext, useContext, useRef } from "react";

const NavigationGuardContext = createContext(null);

export const NavigationGuardProvider = ({ children }) => {
  // function ref that Tutor can register
  const guardRef = useRef(null);

  const registerGuard = (fn) => {
    guardRef.current = fn;
  };

  const canNavigate = async (route) => {
    if (guardRef.current) {
      return await guardRef.current(route);
    }
    return true;
  };

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, canNavigate }}>
      {children}
    </NavigationGuardContext.Provider>
  );
};

export const useNavigationGuard = () => useContext(NavigationGuardContext);
