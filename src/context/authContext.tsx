import {useContext,createContext,useEffect,useState,ReactNode} from 'react'
import { api } from '../config/api'

interface User{
    id:string,
    username:string,
    email:string,
    avatarUrl:string | null
}

interface AuthContextType{
    user:User|null ; 
    isAuthenticated : boolean ;
    isLoading: boolean ;
    checkAuth : () => Promise<void>;
    logout:() => Promise<void>
}

const AuthContext = createContext<AuthContextType|undefined>(undefined);

export const AuthProvider = ({children}:{children:ReactNode}) => {
    const [user,setUser] = useState<User|null>(null);
    const [isLoading,setIsLoading] = useState(true);
    const isAuthenticated = !!user;

    async function checkAuth(){
        try {
            setIsLoading(true);
            const response : { data : { user : User} } = await api.get("/auth/me");
            if(response.data.user){
                setUser(response.data.user);
            }else{
                setUser(null);
            }
        } catch (error) {
            console.error("Auth check failed :",error);
            setUser(null);
        }finally{
            setIsLoading(false);
            return;
        }
    }

    useEffect(()=>{
        checkAuth()
    },[])

    async function logout(){
        try {
            await api.post("/auth/signout");
            setUser(null);
        } catch (error) {
            console.error("Logout failed :",error);
        }
    }

    return (
        <AuthContext.Provider value={{user,logout,isAuthenticated,isLoading,checkAuth}}>
            {children}
        </AuthContext.Provider>
    )
    
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context
}

