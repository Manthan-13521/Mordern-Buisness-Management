class Main {

    public static int[] copy(int[]arr,int[]b){

    }
    public static void main(String[] args) {
        int[] a = { 1, 2, 3 };

        int b[] = a;

        b[1] = 4;

        for (int i = 0; i < b.length; i++) {
            System.out.println(b[i]);
        }
        for (int i = 0; i < b.length; i++) {
            System.out.println(a[i]);
        }
    }
}