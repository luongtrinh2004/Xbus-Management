import { createContext, useContext } from "react";
import type { ListColumn } from "./columns";

export const ListTableContext = createContext<ListColumn[] | null>(null);
export const useListTable = () => useContext(ListTableContext);
